import { z } from 'zod';
import { Readable } from 'node:stream';
import type { FastifyPluginCallback, FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  CreateConversationInput,
  UpdateConversationInput,
  SendMessageInput,
  ConversationView,
  PaginatedConversations,
  MessageView,
  ListConversationsQuery,
  ErrorResponse,
  type StreamEvent,
} from '@aie/core';
import { canWrite } from '../../lib/authorize.js';
import * as svc from './service.js';
import type { ConversationContext, RuntimeDeps } from './service.js';

const IdParams = z.object({ id: z.string().uuid() });
const STREAM_RATE_LIMIT = { max: 30, timeWindow: '1 minute' } as const;

function ctxOf(request: FastifyRequest): ConversationContext {
  return {
    orgId: request.orgId!,
    userId: request.userId!,
    ip: request.ip,
    userAgent: request.headers['user-agent'] ?? null,
  };
}

function depsOf(app: FastifyInstance): RuntimeDeps {
  return {
    provider: app.aiProvider,
    embeddings: app.embeddings,
    tools: app.toolRegistry,
    memoryQueue: app.memoryQueue,
  };
}

/** One SSE frame per StreamEvent. */
async function* sseFrames(stream: AsyncGenerator<StreamEvent>): AsyncGenerator<string> {
  for await (const event of stream) {
    yield `data: ${JSON.stringify(event)}\n\n`;
  }
}

export const conversationRoutes: FastifyPluginCallback = (instance, _opts, done) => {
  const app = instance.withTypeProvider<ZodTypeProvider>();
  const read = [app.authenticate, app.requireOrg] as const;
  const requireWrite = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!canWrite(request.orgRole)) await reply.code(403).send({ error: 'Insufficient permissions' });
  };
  const write = [app.authenticate, app.requireOrg, requireWrite] as const;

  app.get(
    '/conversations',
    { preHandler: [...read], schema: { querystring: ListConversationsQuery, response: { 200: PaginatedConversations, 401: ErrorResponse } } },
    (request) => svc.listConversationsService(app.db, request.orgId!, request.query),
  );

  app.post(
    '/conversations',
    { preHandler: [...write], schema: { body: CreateConversationInput, response: { 201: ConversationView, 403: ErrorResponse, 404: ErrorResponse } } },
    async (request, reply) => {
      const result = await svc.createConversationService(app.db, ctxOf(request), request.body);
      if (result.ok) return reply.code(201).send(result.conversation);
      return reply.code(404).send({ error: 'Employee not found' });
    },
  );

  app.get(
    '/conversations/:id',
    { preHandler: [...read], schema: { params: IdParams, response: { 200: ConversationView, 404: ErrorResponse } } },
    async (request, reply) => {
      const conv = await svc.getConversationService(app.db, request.orgId!, request.params.id);
      if (!conv) return reply.code(404).send({ error: 'Conversation not found' });
      return conv;
    },
  );

  app.get(
    '/conversations/:id/messages',
    { preHandler: [...read], schema: { params: IdParams, response: { 200: z.array(MessageView), 404: ErrorResponse } } },
    async (request, reply) => {
      const messages = await svc.listMessagesService(app.db, request.orgId!, request.params.id);
      if (!messages) return reply.code(404).send({ error: 'Conversation not found' });
      return messages;
    },
  );

  app.patch(
    '/conversations/:id',
    { preHandler: [...write], schema: { params: IdParams, body: UpdateConversationInput, response: { 200: ConversationView, 403: ErrorResponse, 404: ErrorResponse } } },
    async (request, reply) => {
      const conv = await svc.updateConversationService(app.db, ctxOf(request), request.params.id, request.body);
      if (!conv) return reply.code(404).send({ error: 'Conversation not found' });
      return conv;
    },
  );

  app.delete(
    '/conversations/:id',
    { preHandler: [...write], schema: { params: IdParams } },
    async (request, reply) => {
      const ok = await svc.deleteConversationService(app.db, ctxOf(request), request.params.id);
      if (!ok) return reply.code(404).send({ error: 'Conversation not found' });
      return reply.code(204).send();
    },
  );

  // Chat turn — Server-Sent Events. Streamed as a Readable so CORS/onSend hooks
  // still apply; the runtime persists user + assistant messages and usage.
  app.post(
    '/conversations/:id/messages/stream',
    {
      preHandler: [...write],
      config: { rateLimit: STREAM_RATE_LIMIT },
      schema: { params: IdParams, body: SendMessageInput },
    },
    async (request, reply) => {
      const result = await svc.streamMessageService(
        app.db,
        ctxOf(request),
        depsOf(app),
        request.params.id,
        request.body.content,
      );
      if (!result.ok) return reply.code(404).send({ error: 'Conversation not found' });
      reply.header('content-type', 'text/event-stream');
      reply.header('cache-control', 'no-cache, no-transform');
      reply.header('x-accel-buffering', 'no');
      return reply.send(Readable.from(sseFrames(result.stream)));
    },
  );

  app.post(
    '/conversations/:id/summarize',
    { preHandler: [...write], schema: { params: IdParams, response: { 200: ConversationView, 403: ErrorResponse, 404: ErrorResponse } } },
    async (request, reply) => {
      const conv = await svc.summarizeConversationService(app.db, ctxOf(request), depsOf(app), request.params.id);
      if (!conv) return reply.code(404).send({ error: 'Conversation not found' });
      return conv;
    },
  );

  done();
};
