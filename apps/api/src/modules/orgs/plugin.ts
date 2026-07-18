import fp from 'fastify-plugin';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { OrganizationWithRole } from '@aie/core';
import { getMembership } from './service.js';

declare module 'fastify' {
  interface FastifyInstance {
    /**
     * preHandler (run AFTER authenticate): resolves the session's active org,
     * verifies the caller's membership against the database, and exposes the
     * result on the request. Future org-scoped routes chain
     * [app.authenticate, app.requireOrg] and read request.orgId / orgRole.
     */
    requireOrg: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    orgId?: string;
    orgRole?: OrganizationWithRole['role'];
    /** Full membership view resolved by requireOrg. */
    currentOrg?: OrganizationWithRole;
  }
}

export const orgContextPlugin = fp(
  (app) => {
    app.decorate('requireOrg', async function (request: FastifyRequest, reply: FastifyReply) {
      if (!request.userId) {
        await reply.code(401).send({ error: 'Unauthorized' });
        return;
      }
      const orgId = request.activeOrgId;
      if (!orgId) {
        await reply.code(400).send({ error: 'No active organization' });
        return;
      }
      // Never trust the stored id blindly — membership may have been revoked.
      const membership = await getMembership(app.db, request.userId, orgId);
      if (!membership) {
        await reply.code(403).send({ error: 'Not a member of the active organization' });
        return;
      }
      request.orgId = membership.id;
      request.orgRole = membership.role;
      request.currentOrg = membership;
    });
  },
  { name: 'org-context', dependencies: ['session', 'db'] },
);
