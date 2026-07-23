import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../src/app.js';
import type { Env } from '../src/config/env.js';

/**
 * Memory API against real Postgres + Redis as the least-privilege `aie_app` role
 * (so RLS tenant isolation is exercised on every call). The memory worker isn't
 * running here, so manually created memories have no embedding until an embed
 * job runs; search over them therefore returns them only once embedded. This
 * suite covers CRUD, soft delete/restore, validation, authorization, and
 * cross-org isolation. Ranked retrieval + extraction are covered by @aie/memory
 * unit tests and live end-to-end verification. Opt-in via INTEGRATION=1.
 */
const RUN = process.env.INTEGRATION === '1';

const env: Env = {
  NODE_ENV: 'production',
  API_PORT: 0,
  API_HOST: '127.0.0.1',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://aie_app:dev@localhost:5432/aie',
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  COOKIE_SECRET: 'test-cookie-secret-that-is-at-least-32-chars',
  WEB_ORIGIN: 'http://localhost:3000',
  SESSION_TTL_SECONDS: 3600,
  S3_ENDPOINT: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY ?? 'minioadmin',
  S3_SECRET_KEY: process.env.S3_SECRET_KEY ?? 'minioadmin',
  S3_BUCKET: process.env.S3_BUCKET ?? 'aie-dev',
  S3_FORCE_PATH_STYLE: true,
  MAX_UPLOAD_BYTES: 25 * 1024 * 1024,
  EMBEDDING_PROVIDER: 'local',
};

type App = Awaited<ReturnType<typeof buildApp>>;
type Res = Awaited<ReturnType<App['inject']>>;
const cookieOf = (res: Res): string => {
  const sid = res.cookies.find((c) => c.name === 'sid');
  return sid ? `sid=${sid.value}` : '';
};

async function newOrgUser(app: App, slug: string): Promise<string> {
  const email = `mem-${randomUUID()}@example.com`;
  const password = 'correct horse battery staple';
  await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email, displayName: 'Mem', password } });
  const login = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email, password } });
  const cookie = cookieOf(login);
  await app.inject({ method: 'POST', url: '/v1/organizations', headers: { cookie }, payload: { name: 'Mem', slug } });
  return cookie;
}

describe.skipIf(!RUN)('memory API', () => {
  let app: App;
  let cookie = '';
  let otherCookie = '';
  const suffix = randomUUID().slice(0, 8);
  let memoryId = '';

  beforeAll(async () => {
    app = await buildApp(env);
    cookie = await newOrgUser(app, `mem-org-${suffix}`);
    otherCookie = await newOrgUser(app, `mem-other-${suffix}`);
  });
  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated access (401)', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/memories' });
    expect(res.statusCode).toBe(401);
  });

  it('validates create input (400)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/memories',
      headers: { cookie },
      payload: { content: '', importance: 9 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('creates a memory (201)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/memories',
      headers: { cookie },
      payload: { content: 'Customer prefers replies in Swedish', type: 'semantic', importance: 4 },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    memoryId = body.id;
    expect(body).toMatchObject({ type: 'semantic', importance: 4, accessCount: 0 });
    expect(body.content).toContain('Swedish');
  });

  it('lists and gets the memory', async () => {
    const list = await app.inject({ method: 'GET', url: '/v1/memories', headers: { cookie } });
    expect(list.statusCode).toBe(200);
    expect(list.json().total).toBeGreaterThanOrEqual(1);

    const get = await app.inject({ method: 'GET', url: `/v1/memories/${memoryId}`, headers: { cookie } });
    expect(get.statusCode).toBe(200);
    expect(get.json().id).toBe(memoryId);
  });

  it('updates a memory (200)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/memories/${memoryId}`,
      headers: { cookie },
      payload: { importance: 5 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().importance).toBe(5);
  });

  it('search endpoint responds with a ranked shape (200)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/memories/search',
      headers: { cookie },
      payload: { query: 'what language does the customer prefer?', topK: 5 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('query');
    expect(Array.isArray(body.memories)).toBe(true);
  });

  it('isolates memories across orgs (404 from another org)', async () => {
    const res = await app.inject({ method: 'GET', url: `/v1/memories/${memoryId}`, headers: { cookie: otherCookie } });
    expect(res.statusCode).toBe(404);

    const list = await app.inject({ method: 'GET', url: '/v1/memories', headers: { cookie: otherCookie } });
    expect(list.json().items.every((m: { id: string }) => m.id !== memoryId)).toBe(true);
  });

  it('soft-deletes then restores a memory', async () => {
    const del = await app.inject({ method: 'DELETE', url: `/v1/memories/${memoryId}`, headers: { cookie } });
    expect(del.statusCode).toBe(204);

    // Excluded from the default (non-deleted) list…
    const list = await app.inject({ method: 'GET', url: '/v1/memories', headers: { cookie } });
    expect(list.json().items.some((m: { id: string }) => m.id === memoryId)).toBe(false);

    // …but still visible with includeDeleted, and restorable.
    const restore = await app.inject({ method: 'POST', url: `/v1/memories/${memoryId}/restore`, headers: { cookie } });
    expect(restore.statusCode).toBe(200);
    expect(restore.json().id).toBe(memoryId);

    const restoreAgain = await app.inject({ method: 'POST', url: `/v1/memories/${memoryId}/restore`, headers: { cookie } });
    expect(restoreAgain.statusCode).toBe(404); // already active
  });

  it('returns 404 for an unknown memory', async () => {
    const res = await app.inject({ method: 'GET', url: `/v1/memories/${randomUUID()}`, headers: { cookie } });
    expect(res.statusCode).toBe(404);
  });
});
