import { z } from 'zod';
import type { FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  CreatePromptVersionInput,
  PreviewPromptInput,
  EmployeeView,
  PromptVersionView,
  PaginatedEmployees,
  ListEmployeesQuery,
  ErrorResponse,
} from '@aie/core';
import { canWrite } from '../../lib/authorize.js';
import { compilePrompt, validatePrompt } from './prompt-compiler.js';
import type { EmployeeContext } from './service.js';
import * as svc from './service.js';

const IdParams = z.object({ id: z.string().uuid() });
const VersionParams = z.object({ id: z.string().uuid(), versionId: z.string().uuid() });

const PromptPreview = z.object({
  compiledPrompt: z.string(),
  ok: z.boolean(),
  variables: z.array(z.string()),
  errors: z.array(z.string()),
});

function ctxOf(request: FastifyRequest): EmployeeContext {
  return {
    orgId: request.orgId!,
    userId: request.userId!,
    ip: request.ip,
    userAgent: request.headers['user-agent'] ?? null,
  };
}

export const employeeRoutes: FastifyPluginCallback = (instance, _opts, done) => {
  const app = instance.withTypeProvider<ZodTypeProvider>();

  // Reads: any member of the active org. Writes: owner/admin/manager.
  const read = [app.authenticate, app.requireOrg] as const;
  const requireWrite = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!canWrite(request.orgRole)) {
      await reply.code(403).send({ error: 'Insufficient permissions' });
    }
  };
  const write = [app.authenticate, app.requireOrg, requireWrite] as const;

  /* --------------------------------- list --------------------------------- */
  app.get(
    '/employees',
    {
      preHandler: [...read],
      schema: {
        querystring: ListEmployeesQuery,
        response: { 200: PaginatedEmployees, 401: ErrorResponse, 403: ErrorResponse },
      },
    },
    (request) => svc.listEmployeesService(app.db, request.orgId!, request.query),
  );

  /* ----------------------------- prompt preview --------------------------- */
  app.post(
    '/employees/prompt/preview',
    {
      preHandler: [...read],
      schema: { body: PreviewPromptInput, response: { 200: PromptPreview, 401: ErrorResponse } },
    },
    (request) => {
      const compiledPrompt = compilePrompt(request.body);
      const v = validatePrompt(request.body.jobDescription);
      return { compiledPrompt, ok: v.ok, variables: v.variables, errors: v.errors };
    },
  );

  /* -------------------------------- create -------------------------------- */
  app.post(
    '/employees',
    {
      preHandler: [...write],
      schema: {
        body: CreateEmployeeInput,
        response: {
          201: EmployeeView,
          401: ErrorResponse,
          402: ErrorResponse,
          403: ErrorResponse,
          409: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const result = await svc.createEmployeeService(app.db, ctxOf(request), request.body);
      if (result.ok) return reply.code(201).send(result.employee);
      if (result.reason === 'plan_limit') {
        return reply
          .code(402)
          .send({ error: `Your plan allows up to ${result.limit} employee(s)` });
      }
      return reply.code(409).send({ error: 'That slug is already taken' });
    },
  );

  /* --------------------------------- get ---------------------------------- */
  app.get(
    '/employees/:id',
    {
      preHandler: [...read],
      schema: { params: IdParams, response: { 200: EmployeeView, 404: ErrorResponse } },
    },
    async (request, reply) => {
      const employee = await svc.getEmployeeService(app.db, request.orgId!, request.params.id);
      if (!employee) return reply.code(404).send({ error: 'Employee not found' });
      return employee;
    },
  );

  /* -------------------------------- update -------------------------------- */
  app.patch(
    '/employees/:id',
    {
      preHandler: [...write],
      schema: {
        params: IdParams,
        body: UpdateEmployeeInput,
        response: { 200: EmployeeView, 403: ErrorResponse, 404: ErrorResponse, 409: ErrorResponse },
      },
    },
    async (request, reply) => {
      const result = await svc.updateEmployeeService(
        app.db,
        ctxOf(request),
        request.params.id,
        request.body,
      );
      if (!result) return reply.code(404).send({ error: 'Employee not found' });
      if ('slugTaken' in result) return reply.code(409).send({ error: 'That slug is already taken' });
      return result;
    },
  );

  /* -------------------------------- delete -------------------------------- */
  app.delete(
    '/employees/:id',
    {
      preHandler: [...write],
      // No typed response schema: a 204 carries no body, and the zod type
      // provider would otherwise forbid reply.code(204) unless it's declared.
      schema: { params: IdParams },
    },
    async (request, reply) => {
      const ok = await svc.deleteEmployeeService(app.db, ctxOf(request), request.params.id);
      if (!ok) return reply.code(404).send({ error: 'Employee not found' });
      return reply.code(204).send();
    },
  );

  app.post(
    '/employees/:id/restore',
    {
      preHandler: [...write],
      schema: { params: IdParams, response: { 200: EmployeeView, 403: ErrorResponse, 404: ErrorResponse } },
    },
    async (request, reply) => {
      const employee = await svc.restoreEmployeeService(app.db, ctxOf(request), request.params.id);
      if (!employee) return reply.code(404).send({ error: 'Employee not found or not deleted' });
      return employee;
    },
  );

  /* ------------------------------ duplicate ------------------------------- */
  app.post(
    '/employees/:id/duplicate',
    {
      preHandler: [...write],
      schema: {
        params: IdParams,
        response: { 201: EmployeeView, 402: ErrorResponse, 403: ErrorResponse, 404: ErrorResponse, 409: ErrorResponse },
      },
    },
    async (request, reply) => {
      const result = await svc.duplicateEmployeeService(app.db, ctxOf(request), request.params.id);
      if (result.ok) return reply.code(201).send(result.employee);
      if (result.reason === 'not_found') return reply.code(404).send({ error: 'Employee not found' });
      if (result.reason === 'plan_limit') {
        return reply.code(402).send({ error: `Your plan allows up to ${result.limit} employee(s)` });
      }
      return reply.code(409).send({ error: 'That slug is already taken' });
    },
  );

  /* ------------------------- publish / unpublish -------------------------- */
  app.post(
    '/employees/:id/publish',
    { preHandler: [...write], schema: { params: IdParams, response: { 200: EmployeeView, 403: ErrorResponse, 404: ErrorResponse } } },
    async (request, reply) => {
      const employee = await svc.setVisibilityService(app.db, ctxOf(request), request.params.id, 'published');
      if (!employee) return reply.code(404).send({ error: 'Employee not found' });
      return employee;
    },
  );
  app.post(
    '/employees/:id/unpublish',
    { preHandler: [...write], schema: { params: IdParams, response: { 200: EmployeeView, 403: ErrorResponse, 404: ErrorResponse } } },
    async (request, reply) => {
      const employee = await svc.setVisibilityService(app.db, ctxOf(request), request.params.id, 'draft');
      if (!employee) return reply.code(404).send({ error: 'Employee not found' });
      return employee;
    },
  );

  /* ---------------------------- prompt versions --------------------------- */
  app.get(
    '/employees/:id/versions',
    {
      preHandler: [...read],
      schema: { params: IdParams, response: { 200: z.array(PromptVersionView), 404: ErrorResponse } },
    },
    async (request, reply) => {
      const versions = await svc.listPromptVersionsService(app.db, request.orgId!, request.params.id);
      if (!versions) return reply.code(404).send({ error: 'Employee not found' });
      return versions;
    },
  );

  app.post(
    '/employees/:id/versions',
    {
      preHandler: [...write],
      schema: {
        params: IdParams,
        body: CreatePromptVersionInput,
        response: { 201: PromptVersionView, 403: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (request, reply) => {
      const version = await svc.createPromptVersionService(
        app.db,
        ctxOf(request),
        request.params.id,
        request.body,
      );
      if (!version) return reply.code(404).send({ error: 'Employee not found' });
      return reply.code(201).send(version);
    },
  );

  app.post(
    '/employees/:id/versions/:versionId/activate',
    {
      preHandler: [...write],
      schema: { params: VersionParams, response: { 200: PromptVersionView, 403: ErrorResponse, 404: ErrorResponse } },
    },
    async (request, reply) => {
      const version = await svc.activatePromptVersionService(
        app.db,
        ctxOf(request),
        request.params.id,
        request.params.versionId,
      );
      if (!version) return reply.code(404).send({ error: 'Employee or version not found' });
      return version;
    },
  );

  app.post(
    '/employees/:id/recompile',
    {
      preHandler: [...write],
      schema: { params: IdParams, response: { 201: PromptVersionView, 403: ErrorResponse, 404: ErrorResponse } },
    },
    async (request, reply) => {
      const version = await svc.recompilePromptService(app.db, ctxOf(request), request.params.id);
      if (!version) return reply.code(404).send({ error: 'Employee not found' });
      return reply.code(201).send(version);
    },
  );

  done();
};
