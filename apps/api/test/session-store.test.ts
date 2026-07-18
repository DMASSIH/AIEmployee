import { describe, it, expect } from 'vitest';
import type { Redis } from 'ioredis';
import { SessionStore } from '../src/lib/session-store.js';

/** Minimal in-memory Redis stand-in — enough for the store's get/set/expire/del. */
function fakeRedis(): Redis {
  const map = new Map<string, string>();
  return {
    set: (k: string, v: string) => {
      map.set(k, v);
      return Promise.resolve('OK');
    },
    get: (k: string) => Promise.resolve(map.get(k) ?? null),
    expire: () => Promise.resolve(1),
    del: (k: string) => {
      map.delete(k);
      return Promise.resolve(1);
    },
  } as unknown as Redis;
}

/** Unit (hermetic): the session lifecycle behaves as expected. */
describe('SessionStore', () => {
  it('creates a session, returns an opaque id, and reads it back', async () => {
    const store = new SessionStore(fakeRedis(), 3600);
    const id = await store.create('user-1');
    expect(id).toMatch(/^[A-Za-z0-9_-]{40,}$/); // base64url, ~43 chars for 32 bytes
    const data = await store.get(id);
    expect(data?.userId).toBe('user-1');
  });

  it('returns null for an unknown session id', async () => {
    const store = new SessionStore(fakeRedis(), 3600);
    expect(await store.get('nope')).toBeNull();
  });

  it('destroys a session so it no longer resolves', async () => {
    const store = new SessionStore(fakeRedis(), 3600);
    const id = await store.create('user-2');
    await store.destroy(id);
    expect(await store.get(id)).toBeNull();
  });
});
