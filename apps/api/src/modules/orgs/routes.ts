import { z } from 'zod';
import type { FastifyPluginCallback } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  CreateOrganizationInput,
  SwitchOrganizationInput,
  OrganizationWithRole,
  ErrorResponse,
} from '@aie/core';
import { createOrganization, listOrganizations, getMembership } from './service.js';

export const orgRoutes: FastifyPluginCallback = (instance, _opts, done) => {
  const app = instance.withTypeProvider<ZodTypeProvider>();

  app.post(
    '/organizations',
    {
      preHandler: app.authenticate,
      schema: {
        body: CreateOrganizationInput,
        response: { 201: OrganizationWithRole, 401: ErrorResponse, 409: ErrorResponse },
      },
    },
    async (request, reply) => {
      const result = await createOrganization(app.db, request.userId!, request.body);
      if (!result.ok) return reply.code(409).send({ error: 'Slug is already taken' });
      // The new organization becomes this session's active org.
      await app.sessions.update(request.sessionId!, { activeOrgId: result.organization.id });
      return reply.code(201).send(result.organization);
    },
  );

  app.get(
    '/organizations',
    {
      preHandler: app.authenticate,
      schema: { response: { 200: z.array(OrganizationWithRole), 401: ErrorResponse } },
    },
    (request) => listOrganizations(app.db, request.userId!),
  );

  app.get(
    '/organizations/current',
    {
      preHandler: [app.authenticate, app.requireOrg],
      schema: {
        response: {
          200: OrganizationWithRole,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
        },
      },
    },
    // requireOrg already resolved and verified the membership.
    (request) => request.currentOrg!,
  );

  app.post(
    '/organizations/switch',
    {
      preHandler: app.authenticate,
      schema: {
        body: SwitchOrganizationInput,
        response: { 200: OrganizationWithRole, 401: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (request, reply) => {
      // Membership verified server-side — client org ids are never trusted.
      const membership = await getMembership(app.db, request.userId!, request.body.organizationId);
      if (!membership) {
        // Same response for "doesn't exist" and "not a member" (no enumeration).
        return reply.code(404).send({ error: 'Organization not found' });
      }
      await app.sessions.update(request.sessionId!, { activeOrgId: membership.id });
      return reply.send(membership);
    },
  );

  done();
};
