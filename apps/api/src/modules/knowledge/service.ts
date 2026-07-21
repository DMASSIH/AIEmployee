import { randomUUID } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import type { Queue } from 'bullmq';
import { withOrg, type Db } from '@aie/db';
import {
  SUPPORTED_EXTENSIONS,
  isSupportedMime,
  type CreateCollectionInput,
  type UpdateCollectionInput,
  type CollectionView,
  type DocumentView,
  type ListDocumentsQuery,
  type PaginatedDocuments,
  type PaginatedCollections,
  type RetrieveQuery,
  type RetrievalResult,
  type IngestJobData,
} from '@aie/core';
import {
  storageKey,
  retrieve,
  type StorageProvider,
  type EmbeddingProvider,
} from '@aie/knowledge';
import { isUniqueViolation } from '../../lib/db-errors.js';
import { writeAudit, type AuditEntry } from '../../lib/audit.js';
import * as repo from './repository.js';
import type { CollectionRow, DocumentRow } from './repository.js';

export interface KnowledgeContext {
  orgId: string;
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface KnowledgeDeps {
  storage: StorageProvider;
  ingestQueue: Queue<IngestJobData>;
  embeddings: EmbeddingProvider;
}

/* --------------------------------- mapping -------------------------------- */

function toCollectionView(row: CollectionRow, documentCount: number): CollectionView {
  return {
    id: row.id,
    organizationId: row.orgId,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    documentCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDocumentView(row: DocumentRow): DocumentView {
  return {
    id: row.id,
    organizationId: row.orgId,
    collectionId: row.collectionId ?? null,
    name: row.name,
    type: row.type,
    status: row.status,
    mimeType: row.mimeType ?? null,
    sizeBytes: row.sizeBytes ?? null,
    chunkCount: row.chunkCount,
    error: row.error ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function slugify(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base.length >= 2 ? base.slice(0, 50) : 'collection';
}

function audit(
  tx: Parameters<Parameters<Db['transaction']>[0]>[0],
  ctx: KnowledgeContext,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const entry: AuditEntry = {
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action,
    targetType,
    targetId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    metadata,
  };
  return writeAudit(tx, entry);
}

/* ------------------------------ collections ------------------------------- */

export type CollectionResult =
  | { ok: true; collection: CollectionView }
  | { ok: false; reason: 'slug_taken' };

export async function listCollectionsService(
  db: Db,
  orgId: string,
  page: number,
  pageSize: number,
): Promise<PaginatedCollections> {
  return withOrg(db, orgId, async (tx) => {
    const { rows, total } = await repo.listCollections(tx, orgId, page, pageSize);
    return {
      items: rows.map((r) => toCollectionView(r, r.documentCount)),
      total,
      page,
      pageSize,
    };
  });
}

export async function createCollectionService(
  db: Db,
  ctx: KnowledgeContext,
  input: CreateCollectionInput,
): Promise<CollectionResult> {
  try {
    return await withOrg(db, ctx.orgId, async (tx): Promise<CollectionResult> => {
      const slug = input.slug ?? slugify(input.name);
      if (await repo.collectionSlugExists(tx, ctx.orgId, slug)) {
        return { ok: false, reason: 'slug_taken' };
      }
      const row = await repo.insertCollection(tx, {
        orgId: ctx.orgId,
        name: input.name,
        slug,
        description: input.description,
        createdBy: ctx.userId,
      });
      await audit(tx, ctx, 'knowledge.collection.created', 'knowledge_collection', row.id, {
        name: row.name,
      });
      return { ok: true, collection: toCollectionView(row, 0) };
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, reason: 'slug_taken' };
    throw err;
  }
}

export async function updateCollectionService(
  db: Db,
  ctx: KnowledgeContext,
  id: string,
  input: UpdateCollectionInput,
): Promise<CollectionView | null | { slugTaken: true }> {
  try {
    return await withOrg(db, ctx.orgId, async (tx) => {
      const existing = await repo.findCollectionById(tx, id);
      if (!existing) return null;
      if (input.slug && input.slug !== existing.slug) {
        if (await repo.collectionSlugExists(tx, ctx.orgId, input.slug)) {
          return { slugTaken: true as const };
        }
      }
      const patch: Partial<CollectionRow> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.slug !== undefined) patch.slug = input.slug;
      if (input.description !== undefined) patch.description = input.description;
      const row = await repo.updateCollection(tx, id, patch);
      if (!row) return null;
      await audit(tx, ctx, 'knowledge.collection.updated', 'knowledge_collection', id);
      return toCollectionView(row, 0);
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { slugTaken: true as const };
    throw err;
  }
}

export async function deleteCollectionService(
  db: Db,
  ctx: KnowledgeContext,
  id: string,
): Promise<boolean> {
  return withOrg(db, ctx.orgId, async (tx) => {
    const existing = await repo.findCollectionById(tx, id);
    if (!existing) return false;
    // Soft-delete the collection; its documents are detached (collection_id kept
    // but the collection is hidden). Documents are managed/deleted separately.
    await repo.updateCollection(tx, id, { deletedAt: new Date() });
    await audit(tx, ctx, 'knowledge.collection.deleted', 'knowledge_collection', id);
    return true;
  });
}

/* -------------------------------- documents ------------------------------- */

export type UploadResult =
  | { ok: true; document: DocumentView }
  | { ok: false; reason: 'unsupported_type' }
  | { ok: false; reason: 'collection_not_found' };

/** Magic-byte sniff, with an extension fallback for signatureless text files. */
async function resolveMime(buffer: Buffer, filename: string): Promise<string | null> {
  const sniffed = await fileTypeFromBuffer(buffer);
  // Trust magic bytes when present; only text formats have no signature.
  if (sniffed) return isSupportedMime(sniffed.mime) ? sniffed.mime : null;
  const ext = filename.toLowerCase().split('.').pop();
  return (ext && SUPPORTED_EXTENSIONS[ext]) ?? null;
}

async function ingest(deps: KnowledgeDeps, job: IngestJobData): Promise<void> {
  await deps.ingestQueue.add('ingest', job, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2_000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}

/** Store a file, create the document + file rows, and enqueue processing. */
export async function uploadDocumentService(
  db: Db,
  ctx: KnowledgeContext,
  deps: KnowledgeDeps,
  input: { buffer: Buffer; filename: string; name: string; collectionId?: string },
): Promise<UploadResult> {
  const mime = await resolveMime(input.buffer, input.filename);
  if (!mime) return { ok: false, reason: 'unsupported_type' };

  const fileId = randomUUID();
  const key = storageKey(ctx.orgId, fileId);
  await deps.storage.put(key, input.buffer, mime);

  const result = await withOrg(db, ctx.orgId, async (tx): Promise<UploadResult> => {
    if (input.collectionId) {
      const collection = await repo.findCollectionById(tx, input.collectionId);
      if (!collection) return { ok: false, reason: 'collection_not_found' };
    }
    await repo.insertFile(tx, {
      id: fileId,
      orgId: ctx.orgId,
      storageKey: key,
      filename: input.filename,
      mimeType: mime,
      sizeBytes: input.buffer.length,
      purpose: 'knowledge',
      status: 'ready',
      uploadedBy: ctx.userId,
    });
    const doc = await repo.insertDocument(tx, {
      orgId: ctx.orgId,
      collectionId: input.collectionId,
      name: input.name,
      type: 'file',
      status: 'pending',
      fileId,
      mimeType: mime,
      sizeBytes: input.buffer.length,
      createdBy: ctx.userId,
    });
    await audit(tx, ctx, 'knowledge.document.uploaded', 'knowledge_source', doc.id, {
      name: doc.name,
      mime,
    });
    return { ok: true, document: toDocumentView(doc) };
  });

  if (result.ok) await ingest(deps, { sourceId: result.document.id, orgId: ctx.orgId });
  return result;
}

/** Create a document from pasted text — stored as a .txt file, same pipeline. */
export async function createManualDocumentService(
  db: Db,
  ctx: KnowledgeContext,
  deps: KnowledgeDeps,
  input: { name: string; content: string; collectionId?: string },
): Promise<UploadResult> {
  return uploadDocumentService(db, ctx, deps, {
    buffer: Buffer.from(input.content, 'utf8'),
    filename: `${input.name}.txt`,
    name: input.name,
    collectionId: input.collectionId,
  });
}

export async function listDocumentsService(
  db: Db,
  orgId: string,
  query: ListDocumentsQuery,
): Promise<PaginatedDocuments> {
  return withOrg(db, orgId, async (tx) => {
    const { rows, total } = await repo.listDocuments(tx, orgId, query);
    return { items: rows.map(toDocumentView), total, page: query.page, pageSize: query.pageSize };
  });
}

export async function getDocumentService(
  db: Db,
  orgId: string,
  id: string,
): Promise<DocumentView | null> {
  return withOrg(db, orgId, async (tx) => {
    const row = await repo.findDocumentById(tx, id);
    return row ? toDocumentView(row) : null;
  });
}

/** Re-run the pipeline for a document (retry a failed or stale ingest). */
export async function retryDocumentService(
  db: Db,
  ctx: KnowledgeContext,
  deps: KnowledgeDeps,
  id: string,
): Promise<DocumentView | null> {
  const doc = await withOrg(db, ctx.orgId, async (tx) => {
    const existing = await repo.findDocumentById(tx, id);
    if (!existing || !existing.fileId) return null;
    const row = await repo.updateDocument(tx, id, { status: 'pending', error: null });
    if (!row) return null;
    await audit(tx, ctx, 'knowledge.document.retried', 'knowledge_source', id);
    return row;
  });
  if (!doc) return null;
  await ingest(deps, { sourceId: id, orgId: ctx.orgId });
  return toDocumentView(doc);
}

/** Soft-delete a document and reclaim its chunks + stored object. */
export async function deleteDocumentService(
  db: Db,
  ctx: KnowledgeContext,
  deps: KnowledgeDeps,
  id: string,
): Promise<boolean> {
  const key = await withOrg(db, ctx.orgId, async (tx) => {
    const existing = await repo.findDocumentById(tx, id);
    if (!existing) return null;
    await repo.deleteChunksForSource(tx, ctx.orgId, id);
    let storageKeyToDrop: string | null = null;
    if (existing.fileId) {
      const file = await repo.findFileById(tx, existing.fileId);
      if (file) {
        storageKeyToDrop = file.storageKey;
        await repo.markFileDeleted(tx, file.id);
      }
    }
    await repo.updateDocument(tx, id, { deletedAt: new Date(), chunkCount: 0 });
    await audit(tx, ctx, 'knowledge.document.deleted', 'knowledge_source', id);
    return storageKeyToDrop ?? '';
  });
  if (key === null) return false;
  if (key) await deps.storage.delete(key).catch(() => undefined); // best-effort object cleanup
  return true;
}

/* ------------------------------- retrieval -------------------------------- */

export async function retrieveService(
  db: Db,
  orgId: string,
  deps: KnowledgeDeps,
  query: RetrieveQuery,
): Promise<RetrievalResult> {
  return retrieve(db, orgId, deps.embeddings, query);
}
