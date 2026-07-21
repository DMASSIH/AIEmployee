import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../src/app.js';
import type { Env } from '../src/config/env.js';

/**
 * Knowledge base API against real Postgres + Redis + MinIO, as the least-
 * privilege `aie_app` role (so RLS tenant isolation is exercised on every call).
 * The async ingest worker isn't running here, so documents stay `pending`; the
 * full extract→embed→retrieve pipeline is covered by @aie/knowledge unit tests
 * and live end-to-end verification. Opt-in via INTEGRATION=1.
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
  const email = `kb-${randomUUID()}@example.com`;
  const password = 'correct horse battery staple';
  await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email, displayName: 'KB', password } });
  const login = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email, password } });
  const cookie = cookieOf(login);
  await app.inject({ method: 'POST', url: '/v1/organizations', headers: { cookie }, payload: { name: 'KB', slug } });
  return cookie;
}

describe.skipIf(!RUN)('knowledge base', () => {
  let app: App;
  let cookie = '';
  const suffix = randomUUID().slice(0, 8);
  let collectionId = '';
  let documentId = '';

  beforeAll(async () => {
    app = await buildApp(env);
    cookie = await newOrgUser(app, `kb-org-${suffix}`);
  });
  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated access (401)', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/knowledge/documents' });
    expect(res.statusCode).toBe(401);
  });

  it('creates a collection (201) and rejects a duplicate slug (409)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/knowledge/collections',
      headers: { cookie },
      payload: { name: 'Support', slug: `support-${suffix}` },
    });
    expect(res.statusCode).toBe(201);
    collectionId = res.json().id;
    expect(res.json()).toMatchObject({ name: 'Support', documentCount: 0 });

    const dup = await app.inject({
      method: 'POST',
      url: '/v1/knowledge/collections',
      headers: { cookie },
      payload: { name: 'Support 2', slug: `support-${suffix}` },
    });
    expect(dup.statusCode).toBe(409);
  });

  it('creates a manual document into the collection (201, pending)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/knowledge/documents',
      headers: { cookie },
      payload: { name: 'Warranty', content: 'The warranty period is 24 months.', collectionId },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    documentId = body.id;
    expect(body).toMatchObject({ name: 'Warranty', status: 'pending', collectionId, type: 'file' });
  });

  it('rejects a manual document for a missing collection (404)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/knowledge/documents',
      headers: { cookie },
      payload: { name: 'Orphan', content: 'x'.repeat(30), collectionId: randomUUID() },
    });
    expect(res.statusCode).toBe(404);
  });

  it('lists, searches, filters and paginates documents', async () => {
    const list = await app.inject({ method: 'GET', url: '/v1/knowledge/documents', headers: { cookie } });
    expect(list.json().items.map((d: { id: string }) => d.id)).toContain(documentId);

    const search = await app.inject({ method: 'GET', url: '/v1/knowledge/documents?q=warr', headers: { cookie } });
    expect(search.json().total).toBeGreaterThanOrEqual(1);

    // Status filter returns only matching rows (worker-agnostic: a running
    // ingest worker may have already flipped the doc to `ready`).
    const filtered = await app.inject({ method: 'GET', url: '/v1/knowledge/documents?status=ready', headers: { cookie } });
    expect((filtered.json().items as { status: string }[]).every((d) => d.status === 'ready')).toBe(true);

    const paged = await app.inject({ method: 'GET', url: '/v1/knowledge/documents?page=1&pageSize=1', headers: { cookie } });
    expect(paged.json().pageSize).toBe(1);
  });

  it('gets a document and 404s for a missing id', async () => {
    const get = await app.inject({ method: 'GET', url: `/v1/knowledge/documents/${documentId}`, headers: { cookie } });
    expect(get.statusCode).toBe(200);
    const missing = await app.inject({ method: 'GET', url: `/v1/knowledge/documents/${randomUUID()}`, headers: { cookie } });
    expect(missing.statusCode).toBe(404);
  });

  it('retries processing (re-queues, back to pending)', async () => {
    const res = await app.inject({ method: 'POST', url: `/v1/knowledge/documents/${documentId}/retry`, headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('pending');
  });

  it('retrieval returns a well-formed result', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/knowledge/retrieve',
      headers: { cookie },
      payload: { query: 'warranty period', topK: 3 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ query: 'warranty period', chunks: expect.any(Array), citations: expect.any(Array) });
  });

  it('isolates knowledge across organizations', async () => {
    const other = await newOrgUser(app, `kb-other-${suffix}`);
    const list = await app.inject({ method: 'GET', url: '/v1/knowledge/documents', headers: { cookie: other } });
    expect(list.json().items).toEqual([]);
    const get = await app.inject({ method: 'GET', url: `/v1/knowledge/documents/${documentId}`, headers: { cookie: other } });
    expect(get.statusCode).toBe(404);
    const retrieve = await app.inject({
      method: 'POST',
      url: '/v1/knowledge/retrieve',
      headers: { cookie: other },
      payload: { query: 'warranty period', topK: 3 },
    });
    expect(retrieve.json().chunks).toEqual([]);
  });

  it('deletes a document (204) — then it is gone (404)', async () => {
    const del = await app.inject({ method: 'DELETE', url: `/v1/knowledge/documents/${documentId}`, headers: { cookie } });
    expect(del.statusCode).toBe(204);
    const get = await app.inject({ method: 'GET', url: `/v1/knowledge/documents/${documentId}`, headers: { cookie } });
    expect(get.statusCode).toBe(404);
  });

  it('deletes a collection (204)', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/v1/knowledge/collections/${collectionId}`, headers: { cookie } });
    expect(res.statusCode).toBe(204);
  });
});
