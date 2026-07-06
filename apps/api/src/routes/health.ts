import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  // Liveness: "is the process up" — no dependencies checked.
  app.get('/healthz', () => ({ ok: true }));

  // Readiness: "can I serve traffic" — checks real dependencies.
  // DB/Redis pings get wired in the next milestone; shape is here now
  // so load balancers and compose healthchecks never need to change.
  app.get('/readyz', () => ({ ok: true, checks: { db: 'pending', redis: 'pending' } }));
};
