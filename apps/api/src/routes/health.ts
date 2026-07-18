import type { FastifyPluginCallback } from 'fastify';
import { checkDb, checkRedis } from '../lib/health.js';

export const healthRoutes: FastifyPluginCallback = (app, _opts, done) => {
  // Liveness: "is the process up" — no dependencies checked, always 200 if we
  // can answer at all. Used by orchestrators to decide restarts.
  app.get('/healthz', () => ({ status: 'ok' }));

  // Readiness: "can I serve traffic" — every dependency must answer. Returns
  // 200 only when all are healthy, otherwise 503 with per-dependency diagnostics.
  app.get('/readyz', async (_req, reply) => {
    const [db, redis] = await Promise.all([checkDb(app.db), checkRedis(app.redis)]);
    const ready = db.status === 'up' && redis.status === 'up';
    reply.code(ready ? 200 : 503);
    return { status: ready ? 'ok' : 'error', checks: { db, redis } };
  });

  done();
};
