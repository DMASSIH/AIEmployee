import { z } from 'zod';
import type { FastifyPluginCallback, FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  CreateCollectionInput,
  UpdateCollectionInput,
  CollectionView,
  PaginatedCollections,
  CreateManualDocumentInput,
  DocumentView,
  PaginatedDocuments,
  ListDocumentsQuery,
  RetrieveQuery,
  RetrievalResult,
  ErrorResponse,
} from '@aie/core';
import { canWrite } from '../../lib/authorize.js';
import * as svc from './service.js';
import type { KnowledgeContext, KnowledgeDeps } from './service.js';

const IdParams = z.object({ id: z.string().uuid() });
const PageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
const UploadQuery = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  collectionId: z.string().uuid().optional(),
});

function ctxOf(request: FastifyRequest): KnowledgeContext {
  return {
    orgId: request.orgId!,
    userId: request.userId!,
    ip: request.ip,
    userAgent: request.headers['user-agent'] ?? null,
  };
}

function depsOf(app: FastifyInstance): KnowledgeDeps {
  return { storage: app.storage, ingestQueue: app.ingestQueue, embeddings: app.embeddings };
}

export const knowledgeRoutes: FastifyPluginCallback = (instance, _opts, done) => {
  const app = instance.withTypeProvider<ZodTypeProvider>();
  const read = [app.authenticate, app.requireOrg] as const;
  const requireWrite = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!canWrite(request.orgRole)) await reply.code(403).send({ error: 'Insufficient permissions' });
  };
  const write = [app.authenticate, app.requireOrg, requireWrite] as const;

  /* ------------------------------ collections ----------------------------- */
  app.get(
    '/knowledge/collections',
    { preHandler: [...read], schema: { querystring: PageQuery, response: { 200: PaginatedCollections, 401: ErrorResponse } } },
    (request) => svc.listCollectionsService(app.db, request.orgId!, request.query.page, request.query.pageSize),
  );

  app.post(
    '/knowledge/collections',
    { preHandler: [...write], schema: { body: CreateCollectionInput, response: { 201: CollectionView, 403: ErrorResponse, 409: ErrorResponse } } },
    async (request, reply) => {
      const result = await svc.createCollectionService(app.db, ctxOf(request), request.body);
      if (result.ok) return reply.code(201).send(result.collection);
      return reply.code(409).send({ error: 'That collection slug is already taken' });
    },
  );

  app.patch(
    '/knowledge/collections/:id',
    { preHandler: [...write], schema: { params: IdParams, body: UpdateCollectionInput, response: { 200: CollectionView, 403: ErrorResponse, 404: ErrorResponse, 409: ErrorResponse } } },
    async (request, reply) => {
      const result = await svc.updateCollectionService(app.db, ctxOf(request), request.params.id, request.body);
      if (!result) return reply.code(404).send({ error: 'Collection not found' });
      if ('slugTaken' in result) return reply.code(409).send({ error: 'That collection slug is already taken' });
      return result;
    },
  );

  app.delete(
    '/knowledge/collections/:id',
    { preHandler: [...write], schema: { params: IdParams } },
    async (request, reply) => {
      const ok = await svc.deleteCollectionService(app.db, ctxOf(request), request.params.id);
      if (!ok) return reply.code(404).send({ error: 'Collection not found' });
      return reply.code(204).send();
    },
  );

  /* ------------------------------- documents ------------------------------ */
  app.get(
    '/knowledge/documents',
    { preHandler: [...read], schema: { querystring: ListDocumentsQuery, response: { 200: PaginatedDocuments, 401: ErrorResponse } } },
    (request) => svc.listDocumentsService(app.db, request.orgId!, request.query),
  );

  app.get(
    '/knowledge/documents/:id',
    { preHandler: [...read], schema: { params: IdParams, response: { 200: DocumentView, 404: ErrorResponse } } },
    async (request, reply) => {
      const doc = await svc.getDocumentService(app.db, request.orgId!, request.params.id);
      if (!doc) return reply.code(404).send({ error: 'Document not found' });
      return doc;
    },
  );

  // Multipart upload: metadata rides on the query string, the file in the body.
  app.post(
    '/knowledge/documents/upload',
    { preHandler: [...write], schema: { querystring: UploadQuery, response: { 201: DocumentView, 400: ErrorResponse, 403: ErrorResponse, 404: ErrorResponse, 415: ErrorResponse } } },
    async (request, reply) => {
      const data = await request.file();
      if (!data) return reply.code(400).send({ error: 'No file provided' });
      const buffer = await data.toBuffer();
      const name = request.query.name ?? data.filename;
      const result = await svc.uploadDocumentService(app.db, ctxOf(request), depsOf(app), {
        buffer,
        filename: data.filename,
        name,
        collectionId: request.query.collectionId,
      });
      if (result.ok) return reply.code(201).send(result.document);
      if (result.reason === 'collection_not_found') return reply.code(404).send({ error: 'Collection not found' });
      return reply.code(415).send({ error: 'Unsupported document type (pdf, docx, txt, md only)' });
    },
  );

  // Manual document from pasted text.
  app.post(
    '/knowledge/documents',
    { preHandler: [...write], schema: { body: CreateManualDocumentInput, response: { 201: DocumentView, 400: ErrorResponse, 403: ErrorResponse, 404: ErrorResponse } } },
    async (request, reply) => {
      const result = await svc.createManualDocumentService(app.db, ctxOf(request), depsOf(app), request.body);
      if (result.ok) return reply.code(201).send(result.document);
      if (result.reason === 'collection_not_found') return reply.code(404).send({ error: 'Collection not found' });
      return reply.code(400).send({ error: 'Could not create document' });
    },
  );

  app.post(
    '/knowledge/documents/:id/retry',
    { preHandler: [...write], schema: { params: IdParams, response: { 200: DocumentView, 403: ErrorResponse, 404: ErrorResponse } } },
    async (request, reply) => {
      const doc = await svc.retryDocumentService(app.db, ctxOf(request), depsOf(app), request.params.id);
      if (!doc) return reply.code(404).send({ error: 'Document not found' });
      return doc;
    },
  );

  app.delete(
    '/knowledge/documents/:id',
    { preHandler: [...write], schema: { params: IdParams } },
    async (request, reply) => {
      const ok = await svc.deleteDocumentService(app.db, ctxOf(request), depsOf(app), request.params.id);
      if (!ok) return reply.code(404).send({ error: 'Document not found' });
      return reply.code(204).send();
    },
  );

  /* ------------------------------- retrieval ------------------------------ */
  app.post(
    '/knowledge/retrieve',
    { preHandler: [...read], schema: { body: RetrieveQuery, response: { 200: RetrievalResult, 401: ErrorResponse } } },
    (request) => svc.retrieveService(app.db, request.orgId!, depsOf(app), request.body),
  );

  done();
};
