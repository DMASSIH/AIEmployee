import { describe, it, expect } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { healthRoutes } from '../src/routes/health.js';

/**
 * Hermetic health tests: decorate the app with fake db/redis so /readyz logic
 * (aggregation, status codes, diagnostics) is verified deterministically with
 * no real infrastructure. Real connectivity is covered in integration.test.ts.
 */
function buildWithFakes(opts: { dbOk: boolean; redisOk: boolean }): FastifyInstance {
  const app = Fastify();
  const fakeDb = {
    execute: () => (opts.dbOk ? Promise.resolve([]) : Promise.reject(new Error('db unreachable'))),
  };
  const fakeRedis = {
    ping: () => (opts.redisOk ? Promise.resolve('PONG') : Promise.reject(new Error('redis unreachable'))),
  };
  app.decorate('db', fakeDb as unknown as FastifyInstance['db']);
  app.decorate('redis', fakeRedis as unknown as FastifyInstance['redis']);
  app.register(healthRoutes);
  return app;
}

describe('/healthz', () => {
  it('returns 200 even when dependencies are down (liveness only)', async () => {
    const app = buildWithFakes({ dbOk: false, redisOk: false });
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
    await app.close();
  });
});

describe('/readyz', () => {
  it('returns 200 when db and redis are both up', async () => {
    const app = buildWithFakes({ dbOk: true, redisOk: true });
    const res = await app.inject({ method: 'GET', url: '/readyz' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.checks.db.status).toBe('up');
    expect(body.checks.redis.status).toBe('up');
    await app.close();
  });

  it('returns 503 with diagnostics when db is down', async () => {
    const app = buildWithFakes({ dbOk: false, redisOk: true });
    const res = await app.inject({ method: 'GET', url: '/readyz' });
    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.status).toBe('error');
    expect(body.checks.db.status).toBe('down');
    expect(body.checks.db.error).toBeTruthy();
    expect(body.checks.redis.status).toBe('up');
    await app.close();
  });

  it('returns 503 when redis is down', async () => {
    const app = buildWithFakes({ dbOk: true, redisOk: false });
    const res = await app.inject({ method: 'GET', url: '/readyz' });
    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.status).toBe('error');
    expect(body.checks.redis.status).toBe('down');
    expect(body.checks.redis.error).toBeTruthy();
    await app.close();
  });
});
