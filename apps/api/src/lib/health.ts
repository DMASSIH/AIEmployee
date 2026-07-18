import { sql, type Db } from '@aie/db';
import type { Redis } from 'ioredis';
import { withTimeout } from './with-timeout.js';

/** Result of probing a single dependency. */
export interface Check {
  status: 'up' | 'down';
  latencyMs: number;
  error?: string;
}

/** Run a probe, measure it, and normalize success/failure into a {@link Check}. */
async function timed(probe: () => Promise<unknown>, timeoutMs = 2000): Promise<Check> {
  const start = Date.now();
  try {
    await withTimeout(probe(), timeoutMs, 'timeout');
    return { status: 'up', latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: 'down',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** PostgreSQL is reachable if a trivial round-trip succeeds. */
export const checkDb = (db: Db): Promise<Check> => timed(() => db.execute(sql`select 1`));

/** Redis is reachable if it answers PING. */
export const checkRedis = (redis: Redis): Promise<Check> => timed(() => redis.ping());
