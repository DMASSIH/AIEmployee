import { randomBytes } from 'node:crypto';
import type { Redis } from 'ioredis';

/** What we persist per session. Small on purpose — the DB is the source of truth. */
export interface SessionData {
  userId: string;
  createdAt: number;
}

/**
 * Server-side sessions backed by Redis. An opaque 256-bit id is the only thing
 * that ever lives in the cookie; all state stays here, so logout (destroy) is a
 * real invalidation. TTL is applied on create and refreshed on access (sliding).
 */
export class SessionStore {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number,
  ) {}

  private key(id: string): string {
    return `sess:${id}`;
  }

  async create(userId: string): Promise<string> {
    const id = randomBytes(32).toString('base64url');
    const data: SessionData = { userId, createdAt: Date.now() };
    await this.redis.set(this.key(id), JSON.stringify(data), 'EX', this.ttlSeconds);
    return id;
  }

  async get(id: string): Promise<SessionData | null> {
    const raw = await this.redis.get(this.key(id));
    return raw ? (JSON.parse(raw) as SessionData) : null;
  }

  async touch(id: string): Promise<void> {
    await this.redis.expire(this.key(id), this.ttlSeconds);
  }

  async destroy(id: string): Promise<void> {
    await this.redis.del(this.key(id));
  }
}
