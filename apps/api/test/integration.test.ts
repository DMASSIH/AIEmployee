import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app.js';
import type { Env } from '../src/config/env.js';

/**
 * Integration coverage for the db + redis plugins, readiness, startup, and
 * graceful shutdown against REAL Postgres and Redis. Opt-in and deterministic:
 * it only runs when INTEGRATION=1 and the compose services are up; otherwise it
 * is skipped (never a flaky failure).
 *
 *   INTEGRATION=1 pnpm --filter @aie/api test
 */
const RUN = process.env.INTEGRATION === '1';

// NODE_ENV=production keeps the logger transport-free so no pino-pretty worker
// thread lingers after the process under test shuts down.
const env: Env = {
  NODE_ENV: 'production',
  API_PORT: 0,
  API_HOST: '127.0.0.1',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://aie_app:dev@localhost:5432/aie',
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  COOKIE_SECRET: 'test-cookie-secret-that-is-at-least-32-chars',
  WEB_ORIGIN: 'http://localhost:3000',
};

describe.skipIf(!RUN)('integration: plugins + readiness + shutdown', () => {
  it('boots, injects db/redis, reports ready, and shuts down cleanly', async () => {
    const app = await buildApp(env);

    // Dependency injection: decorations are present, not module globals.
    expect(app.db).toBeTruthy();
    expect(app.redis).toBeTruthy();

    // Readiness against real services.
    const res = await app.inject({ method: 'GET', url: '/readyz' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.checks.db.status).toBe('up');
    expect(body.checks.redis.status).toBe('up');

    // Graceful shutdown closes redis and the pg pool.
    await app.close();
    expect(app.redis.status).toBe('end');
    await expect(app.db.$client`select 1`).rejects.toThrow();
  });
});
