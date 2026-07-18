import { randomBytes } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { RegisterInput, LoginInput, PublicUser, ErrorResponse } from '@aie/core';
import { hashPassword } from '../../lib/password.js';
import { readSessionId } from '../../plugins/session.js';
import { registerUser, authenticateUser, getUserById } from './service.js';

/** Stricter per-route limits for credential endpoints (global default is 300/min). */
const AUTH_RATE_LIMIT = { max: 10, timeWindow: '1 minute' } as const;

export const authRoutes: FastifyPluginAsync = async (instance) => {
  const app = instance.withTypeProvider<ZodTypeProvider>();

  // Decoy hash so a login for an unknown email costs the same as a real one.
  const decoyHash = await hashPassword(randomBytes(16).toString('hex'));

  app.post(
    '/auth/register',
    {
      schema: { body: RegisterInput, response: { 201: PublicUser, 409: ErrorResponse } },
      config: { rateLimit: AUTH_RATE_LIMIT },
    },
    async (request, reply) => {
      const result = await registerUser(app.db, request.body);
      if (!result.ok) {
        // Generic message — does not confirm which field conflicted.
        return reply.code(409).send({ error: 'Registration could not be completed' });
      }
      return reply.code(201).send(result.user);
    },
  );

  app.post(
    '/auth/login',
    {
      schema: { body: LoginInput, response: { 200: PublicUser, 401: ErrorResponse } },
      config: { rateLimit: AUTH_RATE_LIMIT },
    },
    async (request, reply) => {
      const user = await authenticateUser(app.db, decoyHash, request.body);
      if (!user) {
        // Identical response for unknown email and wrong password (no enumeration).
        return reply.code(401).send({ error: 'Invalid email or password' });
      }
      const sid = await app.sessions.create(user.id);
      reply.setSessionCookie(sid);
      return reply.code(200).send(user);
    },
  );

  // Idempotent: clears the cookie and destroys any server-side session.
  app.post('/auth/logout', async (request, reply) => {
    const sid = readSessionId(request);
    if (sid) await app.sessions.destroy(sid);
    reply.clearSessionCookie();
    return reply.code(204).send();
  });

  app.get(
    '/me',
    { preHandler: app.authenticate, schema: { response: { 200: PublicUser, 401: ErrorResponse } } },
    async (request, reply) => {
      const user = await getUserById(app.db, request.userId!);
      if (!user) return reply.code(401).send({ error: 'Unauthorized' });
      return reply.send(user);
    },
  );
};
