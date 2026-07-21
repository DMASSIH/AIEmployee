import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../src/app.js';
import type { Env } from '../src/config/env.js';

/**
 * Organizations & multi-tenancy flow against real Postgres + Redis, running as
 * the least-privilege `aie_app` role — so every read/write here also exercises
 * the RLS policies (tenant_isolation + the M7 member_* read policies).
 * Opt-in (INTEGRATION=1); random emails/slugs keep runs deterministic against
 * a persistent local database.
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

async function signUpAndLogin(app: App, email: string): Promise<string> {
  const password = 'correct horse battery staple';
  await app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: { email, displayName: 'Org Tester', password },
  });
  const login = await app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    payload: { email, password },
  });
  return cookieOf(login);
}

describe.skipIf(!RUN)('organizations & multi-tenancy', () => {
  let app: App;
  let cookie = '';
  const suffix = randomUUID().slice(0, 8);
  const slugA = `acme-${suffix}`;
  const slugB = `globex-${suffix}`;
  let orgAId = '';
  let orgBId = '';

  beforeAll(async () => {
    app = await buildApp(env);
    cookie = await signUpAndLogin(app, `org-user-${randomUUID()}@example.com`);
  });
  afterAll(async () => {
    await app.close();
  });

  it('rejects organization creation without a session (401)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/organizations',
      payload: { name: 'Acme', slug: slugA },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects /organizations/current before any org exists (400 no active org)', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/organizations/current', headers: { cookie } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('No active organization');
  });

  it('creates an organization with the creator as owner (201)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/organizations',
      headers: { cookie },
      payload: { name: 'Acme', slug: slugA },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toEqual({
      id: expect.any(String),
      name: 'Acme',
      slug: slugA,
      plan: 'trial',
      role: 'owner',
    });
    orgAId = body.id;
  });

  it('the new organization is the session-active org (current → 200, owner)', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/organizations/current', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: orgAId, slug: slugA, role: 'owner' });
  });

  it('rejects a duplicate slug (409)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/organizations',
      headers: { cookie },
      payload: { name: 'Acme Again', slug: slugA },
    });
    expect(res.statusCode).toBe(409);
  });

  it('rejects an invalid slug at validation (400)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/organizations',
      headers: { cookie },
      payload: { name: 'Bad', slug: 'Not A Slug!' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('lists all organizations the user belongs to', async () => {
    const b = await app.inject({
      method: 'POST',
      url: '/v1/organizations',
      headers: { cookie },
      payload: { name: 'Globex', slug: slugB },
    });
    expect(b.statusCode).toBe(201);
    orgBId = b.json().id;

    const res = await app.inject({ method: 'GET', url: '/v1/organizations', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    const list = res.json() as { id: string; role: string }[];
    expect(list).toHaveLength(2);
    expect(list.map((o) => o.id)).toEqual(expect.arrayContaining([orgAId, orgBId]));
    expect(list.every((o) => o.role === 'owner')).toBe(true);
  });

  it('switches the active organization and current reflects it', async () => {
    // Creating org B made it active; switch back to A.
    const sw = await app.inject({
      method: 'POST',
      url: '/v1/organizations/switch',
      headers: { cookie },
      payload: { organizationId: orgAId },
    });
    expect(sw.statusCode).toBe(200);
    expect(sw.json()).toMatchObject({ id: orgAId, role: 'owner' });

    const cur = await app.inject({ method: 'GET', url: '/v1/organizations/current', headers: { cookie } });
    expect(cur.json()).toMatchObject({ id: orgAId });
  });

  it('rejects switching to a non-existent organization (404)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/organizations/switch',
      headers: { cookie },
      payload: { organizationId: randomUUID() },
    });
    expect(res.statusCode).toBe(404);
  });

  it('membership validation: another user cannot switch into or see the org', async () => {
    const otherCookie = await signUpAndLogin(app, `intruder-${randomUUID()}@example.com`);

    const sw = await app.inject({
      method: 'POST',
      url: '/v1/organizations/switch',
      headers: { cookie: otherCookie },
      payload: { organizationId: orgAId },
    });
    // Same 404 as "doesn't exist" — no org enumeration for non-members.
    expect(sw.statusCode).toBe(404);

    const list = await app.inject({ method: 'GET', url: '/v1/organizations', headers: { cookie: otherCookie } });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toEqual([]);
  });
});
