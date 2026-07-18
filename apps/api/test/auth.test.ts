import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../src/app.js';
import type { Env } from '../src/config/env.js';

/**
 * Full authentication flow against real Postgres + Redis. Opt-in (INTEGRATION=1)
 * and deterministic: a fresh random email per run avoids collisions with a
 * persistent local database. Requires migrations applied (users auth fields).
 */
const RUN = process.env.INTEGRATION === '1';

const env: Env = {
  NODE_ENV: 'production', // transport-free logger; keeps the run clean
  API_PORT: 0,
  API_HOST: '127.0.0.1',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://aie_app:dev@localhost:5432/aie',
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  COOKIE_SECRET: 'test-cookie-secret-that-is-at-least-32-chars',
  WEB_ORIGIN: 'http://localhost:3000',
  SESSION_TTL_SECONDS: 3600,
};

type Res = Awaited<ReturnType<Awaited<ReturnType<typeof buildApp>>['inject']>>;
const sidOf = (res: Res): { value: string; httpOnly?: boolean } | undefined =>
  res.cookies.find((c) => c.name === 'sid');

describe.skipIf(!RUN)('authentication flow', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  const email = `user-${randomUUID()}@example.com`;
  const password = 'correct horse battery staple';
  let cookie = '';

  beforeAll(async () => {
    app = await buildApp(env);
  });
  afterAll(async () => {
    await app.close();
  });

  it('registers a new user (201) without leaking the password hash', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, displayName: 'Test User', password },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ id: expect.any(String), email, displayName: 'Test User' });
    expect(res.payload).not.toMatch(/argon2|passwordHash|password_hash/i);
  });

  it('rejects duplicate registration (409)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, displayName: 'Test User', password },
    });
    expect(res.statusCode).toBe(409);
  });

  it('rejects a too-weak password at validation (400)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: `weak-${randomUUID()}@example.com`, displayName: 'X', password: 'short' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects login with a wrong password (generic 401)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password: 'definitely-not-the-password' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Invalid email or password');
  });

  it('rejects login for an unknown email with the same generic 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: `nobody-${randomUUID()}@example.com`, password },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Invalid email or password');
  });

  it('logs in with correct credentials and sets an httpOnly session cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: expect.any(String), email, displayName: 'Test User' });
    const sid = sidOf(res);
    expect(sid).toBeTruthy();
    expect(sid?.httpOnly).toBe(true);
    cookie = `sid=${sid?.value}`;
  });

  it('serves /me for an authenticated session', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/me', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: expect.any(String), email, displayName: 'Test User' });
  });

  it('rejects /me without a session (401)', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/me' });
    expect(res.statusCode).toBe(401);
  });

  it('logs out (204) and invalidates the session server-side', async () => {
    const out = await app.inject({ method: 'POST', url: '/v1/auth/logout', headers: { cookie } });
    expect(out.statusCode).toBe(204);
    // The same cookie must no longer authenticate — the session was destroyed.
    const res = await app.inject({ method: 'GET', url: '/v1/me', headers: { cookie } });
    expect(res.statusCode).toBe(401);
  });
});
