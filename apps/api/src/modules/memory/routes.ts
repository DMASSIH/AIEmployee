import { z } from 'zod';
import type { FastifyPluginCallback, FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  CreateMemoryInput,
  UpdateMemoryInput,
  ListMemoriesQuery,
  PaginatedMemories,
  MemoryView,
  SearchMemoriesInput,
  MemorySearchResult,
  ConversationSummaryView,
  RegenerateSummaryResult,
  ErrorResponse,
} from '@aie/core';
import { canWrite } from '../../lib/authorize.js';
import * as svc from './service.js';
import type { MemoryContext, MemoryDeps } from './service.js';

const IdParams = z.object({ id: z.string().uuid() });

// Search embeds the query (work + potential cost) — cap it tighter than reads.
const SEARCH_RATE_LIMIT = { max: 30, timeWindow: '1 minute' } as const;

function ctxOf(request: FastifyRequest): MemoryContext {
  return {
    orgId: request.orgId!,
    userId: request.userId!,
    ip: request.ip,
    userAgent: request.headers['user-agent'] ?? null,
  };
}

function depsOf(app: FastifyInstance): MemoryDeps {
  return { embeddings: app.embeddings, memoryQueue: app.memoryQueue };
}

export const memoryRoutes: FastifyPluginCallback = (instance, _opts, done) => {
  const app = instance.withTypeProvider<ZodTypeProvider>();
  const read = [app.authenticate, app.requireOrg] as const;
  const requireWrite = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!canWrite(request.orgRole)) await reply.code(403).send({ error: 'Insufficient permissions' });
  };
  const write = [app.authenticate, app.requireOrg, requireWrite] as const;

  /* --------------------------------- list --------------------------------- */
  app.get(
    '/memories',
    {
      preHandler: [...read],
      schema: { querystring: ListMemoriesQuery, response: { 200: PaginatedMemories, 401: ErrorResponse } },
    },
    (request) => svc.listMemoriesService(app.db, request.orgId!, request.query),
  );

  /* -------------------------------- search -------------------------------- */
  app.post(
    '/memories/search',
    {
      preHandler: [...read],
      config: { rateLimit: SEARCH_RATE_LIMIT },
      schema: { body: SearchMemoriesInput, response: { 200: MemorySearchResult, 401: ErrorResponse } },
    },
    (request) => svc.searchMemoriesService(app.db, request.orgId!, depsOf(app), request.body),
  );

  /* --------------------------- conversation summary ----------------------- */
  // Placed before /memories/:id so "conversations" isn't parsed as an :id.
  app.get(
    '/memories/conversations/:id/summary',
    {
      preHandler: [...read],
      schema: { params: IdParams, response: { 200: ConversationSummaryView, 404: ErrorResponse } },
    },
    async (request, reply) => {
      const summary = await svc.getConversationSummaryService(app.db, request.orgId!, request.params.id);
      if (!summary) return reply.code(404).send({ error: 'Conversation not found' });
      return summary;
    },
  );

  app.post(
    '/memories/conversations/:id/summary/regenerate',
    {
      preHandler: [...write],
      config: { rateLimit: SEARCH_RATE_LIMIT },
      schema: { params: IdParams, response: { 202: RegenerateSummaryResult, 403: ErrorResponse, 404: ErrorResponse } },
    },
    async (request, reply) => {
      const result = await svc.regenerateSummaryService(app.db, ctxOf(request), depsOf(app), request.params.id);
      if (!result) return reply.code(404).send({ error: 'Conversation not found' });
      return reply.code(202).send(result);
    },
  );

  /* ---------------------------------- get --------------------------------- */
  app.get(
    '/memories/:id',
    { preHandler: [...read], schema: { params: IdParams, response: { 200: MemoryView, 404: ErrorResponse } } },
    async (request, reply) => {
      const memory = await svc.getMemoryService(app.db, request.orgId!, request.params.id);
      if (!memory) return reply.code(404).send({ error: 'Memory not found' });
      return memory;
    },
  );

  /* -------------------------------- create -------------------------------- */
  app.post(
    '/memories',
    { preHandler: [...write], schema: { body: CreateMemoryInput, response: { 201: MemoryView, 403: ErrorResponse } } },
    async (request, reply) => {
      const memory = await svc.createMemoryService(app.db, ctxOf(request), depsOf(app), request.body);
      return reply.code(201).send(memory);
    },
  );

  /* -------------------------------- update -------------------------------- */
  app.patch(
    '/memories/:id',
    {
      preHandler: [...write],
      schema: { params: IdParams, body: UpdateMemoryInput, response: { 200: MemoryView, 403: ErrorResponse, 404: ErrorResponse } },
    },
    async (request, reply) => {
      const memory = await svc.updateMemoryService(app.db, ctxOf(request), depsOf(app), request.params.id, request.body);
      if (!memory) return reply.code(404).send({ error: 'Memory not found' });
      return memory;
    },
  );

  /* -------------------------------- delete -------------------------------- */
  app.delete(
    '/memories/:id',
    { preHandler: [...write], schema: { params: IdParams } },
    async (request, reply) => {
      const ok = await svc.deleteMemoryService(app.db, ctxOf(request), request.params.id);
      if (!ok) return reply.code(404).send({ error: 'Memory not found' });
      return reply.code(204).send();
    },
  );

  /* -------------------------------- restore ------------------------------- */
  app.post(
    '/memories/:id/restore',
    { preHandler: [...write], schema: { params: IdParams, response: { 200: MemoryView, 403: ErrorResponse, 404: ErrorResponse } } },
    async (request, reply) => {
      const memory = await svc.restoreMemoryService(app.db, ctxOf(request), request.params.id);
      if (!memory) return reply.code(404).send({ error: 'Memory not found or not deleted' });
      return memory;
    },
  );

  done();
};
