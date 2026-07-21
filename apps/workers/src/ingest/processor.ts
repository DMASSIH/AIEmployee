import { withOrg, schema, eq, and, type Db } from '@aie/db';
import { processDocument, type StorageProvider, type EmbeddingProvider } from '@aie/knowledge';
import type { IngestJobData } from '@aie/core';

export interface IngestDeps {
  db: Db;
  storage: StorageProvider;
  embeddings: EmbeddingProvider;
}

const { knowledgeSources, knowledgeChunks, files } = schema;

/**
 * Process ONE document: mark it processing, download the file, run
 * extract→chunk→embed, then atomically replace its chunks and mark it ready.
 * Idempotent — re-running (retry / re-index) deletes prior chunks first, so a
 * partially-processed document heals on the next run. On failure the document
 * is marked `failed` with the error, and the error is rethrown so BullMQ can
 * apply its retry/backoff policy.
 */
export async function runIngest(job: IngestJobData, deps: IngestDeps): Promise<{ chunkCount: number }> {
  const { db, storage, embeddings } = deps;

  // 1. Load the document + its file, and flip it to `processing`.
  const loaded = await withOrg(db, job.orgId, async (tx) => {
    const [src] = await tx
      .select({ id: knowledgeSources.id, name: knowledgeSources.name, fileId: knowledgeSources.fileId, mimeType: knowledgeSources.mimeType })
      .from(knowledgeSources)
      .where(and(eq(knowledgeSources.id, job.sourceId), eq(knowledgeSources.orgId, job.orgId)))
      .limit(1);
    if (!src) return null;
    await tx
      .update(knowledgeSources)
      .set({ status: 'processing', error: null, updatedAt: new Date() })
      .where(eq(knowledgeSources.id, src.id));
    let file: { storageKey: string; mimeType: string } | null = null;
    if (src.fileId) {
      const [f] = await tx
        .select({ storageKey: files.storageKey, mimeType: files.mimeType })
        .from(files)
        .where(eq(files.id, src.fileId))
        .limit(1);
      file = f ?? null;
    }
    return { src, file };
  });

  if (!loaded) throw new Error(`knowledge source ${job.sourceId} not found`);
  if (!loaded.file) throw new Error(`knowledge source ${job.sourceId} has no backing file`);

  try {
    // 2. Heavy work OUTSIDE any transaction (network download + CPU).
    const buffer = await storage.get(loaded.file.storageKey);
    const mime = loaded.src.mimeType ?? loaded.file.mimeType;
    const result = await processDocument(buffer, mime, embeddings);

    // 3. Atomically replace chunks + mark ready.
    await withOrg(db, job.orgId, async (tx) => {
      await tx
        .delete(knowledgeChunks)
        .where(and(eq(knowledgeChunks.orgId, job.orgId), eq(knowledgeChunks.sourceId, job.sourceId)));
      if (result.chunks.length > 0) {
        await tx.insert(knowledgeChunks).values(
          result.chunks.map((c) => ({
            orgId: job.orgId,
            sourceId: job.sourceId,
            chunkIndex: c.chunkIndex,
            content: c.content,
            embedding: c.embedding,
            tokenCount: c.tokenCount,
            embeddingModel: result.model,
            metadata: { ...c.metadata, sourceName: loaded.src.name },
          })),
        );
      }
      await tx
        .update(knowledgeSources)
        .set({ status: 'ready', chunkCount: result.chunks.length, error: null, updatedAt: new Date() })
        .where(eq(knowledgeSources.id, job.sourceId));
    });

    return { chunkCount: result.chunks.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ingestion failed';
    await withOrg(db, job.orgId, (tx) =>
      tx
        .update(knowledgeSources)
        .set({ status: 'failed', error: message.slice(0, 500), updatedAt: new Date() })
        .where(eq(knowledgeSources.id, job.sourceId)),
    );
    throw err;
  }
}
