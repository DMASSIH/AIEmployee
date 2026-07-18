import fp from 'fastify-plugin';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { SessionStore } from '../lib/session-store.js';

/** Single source of truth for the session cookie name. */
export const SESSION_COOKIE = 'sid';

declare module 'fastify' {
  interface FastifyInstance {
    sessions: SessionStore;
    /** preHandler: 401s unless a valid session cookie is present; sets request.userId. */
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    userId?: string;
  }
  interface FastifyReply {
    setSessionCookie(sid: string): FastifyReply;
    clearSessionCookie(): FastifyReply;
  }
}

export interface SessionPluginOptions {
  ttlSeconds: number;
  /** Set the cookie's Secure attribute (production/HTTPS only). */
  secure: boolean;
}

/** Read + verify the signed session id from the request cookie, or null. */
export function readSessionId(request: FastifyRequest): string | null {
  const raw = request.cookies[SESSION_COOKIE];
  if (!raw) return null;
  const unsigned = request.unsignCookie(raw);
  return unsigned.valid ? unsigned.value : null;
}

export const sessionPlugin = fp<SessionPluginOptions>(
  // Synchronous body: all wiring here is decoration (no awaits).
  (app, opts) => {
    const store = new SessionStore(app.redis, opts.ttlSeconds);
    app.decorate('sessions', store);

    app.decorateReply('setSessionCookie', function (this: FastifyReply, sid: string) {
      return this.setCookie(SESSION_COOKIE, sid, {
        httpOnly: true,
        sameSite: 'lax',
        secure: opts.secure,
        path: '/',
        signed: true,
        maxAge: opts.ttlSeconds,
      });
    });

    app.decorateReply('clearSessionCookie', function (this: FastifyReply) {
      return this.clearCookie(SESSION_COOKIE, { path: '/' });
    });

    app.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
      const sid = readSessionId(request);
      const session = sid ? await store.get(sid) : null;
      if (!sid || !session) {
        await reply.code(401).send({ error: 'Unauthorized' });
        return;
      }
      await store.touch(sid); // sliding expiration
      request.userId = session.userId;
    });
  },
  { name: 'session', dependencies: ['redis'] },
);
