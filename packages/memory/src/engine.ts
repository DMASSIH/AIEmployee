import { withOrg, type Db } from '@aie/db';
import type { EmbeddingProvider } from '@aie/knowledge';
import type { MemoryChatProvider } from './provider.js';
import type { MemoryType } from '@aie/core';
import {
  insertMemories,
  findByConversation,
  findWithoutEmbedding,
  findForReindex,
  findMemoryById,
  setEmbedding,
  purgeDeletedBefore,
  type MemoryRow,
} from './repository.js';
import { extractMemories } from './extraction.js';
import { summarizeConversation } from './summarization.js';
import { embedMemories } from './embedding.js';
import { dedupeCandidates } from './dedup.js';
import { retrieveMemories, type RetrieveMemoriesOptions, type RetrieveMemoriesResult } from './retrieval.js';

export interface MemoryEngineDeps {
  db: Db;
  embeddings: EmbeddingProvider;
  /** Injected — a structural subset of @aie/ai's AIProvider (no @aie/ai import). */
  provider: MemoryChatProvider;
}

export interface ExtractInput {
  orgId: string;
  transcript: string;
  conversationId?: string;
  employeeId?: string;
  createdBy?: string;
}

export interface ExtractResult {
  extracted: number;
  deduped: number;
  inserted: MemoryRow[];
}

export interface CleanupResult {
  purged: number;
}

export interface ReindexResult {
  reindexed: number;
}

/**
 * The background orchestrator for durable memory. Everything that needs the AI
 * provider or the embedding provider — extraction, summarization, embedding,
 * reindex — runs HERE (driven by the BullMQ memory worker), never in a request
 * handler. Retrieval is exposed too so the runtime has a single call site.
 *
 * Dependency injection: the AI provider is passed in as the narrow
 * MemoryChatProvider so this package never imports @aie/ai (which imports us).
 */
export class MemoryEngine {
  constructor(private readonly deps: MemoryEngineDeps) {}

  /** Ranked retrieval for the runtime/API. */
  retrieve(orgId: string, query: string, opts?: RetrieveMemoriesOptions): Promise<RetrieveMemoriesResult> {
    return retrieveMemories(this.deps.db, orgId, this.deps.embeddings, query, opts);
  }

  /** Summarize a transcript (background summarize job). */
  summarize(transcript: string): Promise<string> {
    return summarizeConversation(this.deps.provider, transcript);
  }

  /**
   * Extract → embed → dedupe → persist durable memories from a conversation.
   * Dedup is against memories already extracted from the same conversation plus
   * the batch itself, so re-running the job is idempotent-ish. Embedding is done
   * up front so dedup can use it and rows land search-ready.
   */
  async extractFromConversation(input: ExtractInput): Promise<ExtractResult> {
    const { db, embeddings, provider } = this.deps;
    const candidates = await extractMemories(provider, input.transcript);
    if (candidates.length === 0) return { extracted: 0, deduped: 0, inserted: [] };

    const vectors = await embedMemories(embeddings, candidates.map((c) => c.content));
    const withEmbeddings = candidates.map((c, i) => ({ ...c, embedding: vectors[i] ?? null }));

    const inserted = await withOrg(db, input.orgId, async (tx) => {
      const existing = input.conversationId
        ? await findByConversation(tx, input.orgId, input.conversationId)
        : [];
      const { unique } = dedupeCandidates(
        withEmbeddings,
        existing.map((e) => ({ content: e.content, embedding: e.embedding })),
      );
      if (unique.length === 0) return [];
      return insertMemories(
        tx,
        unique.map((u) => ({
          orgId: input.orgId,
          employeeId: input.employeeId ?? null,
          type: u.type,
          content: u.content,
          importance: u.importance,
          embedding: u.embedding,
          embeddingModel: u.embedding ? embeddings.model : null,
          sourceConversationId: input.conversationId ?? null,
          createdBy: input.createdBy ?? null,
        })),
      );
    });

    return {
      extracted: candidates.length,
      deduped: candidates.length - inserted.length,
      inserted,
    };
  }

  /**
   * Backfill embeddings for memories that lack them (embed job). Also the path
   * for manually created memories, which are inserted without an embedding.
   */
  async embedPending(orgId: string, limit = 100): Promise<{ embedded: number }> {
    const { db, embeddings } = this.deps;
    const rows = await withOrg(db, orgId, (tx) => findWithoutEmbedding(tx, orgId, limit));
    if (rows.length === 0) return { embedded: 0 };
    const vectors = await embedMemories(embeddings, rows.map((r) => r.content));
    await withOrg(db, orgId, async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        await setEmbedding(tx, rows[i]!.id, vectors[i]!, embeddings.model);
      }
    });
    return { embedded: rows.length };
  }

  /**
   * Recompute embeddings (reindex job) — one memory if `memoryId` is given, else
   * every non-deleted memory in the org (e.g. after an embedding-model change).
   */
  async reindex(orgId: string, memoryId?: string): Promise<ReindexResult> {
    const { db, embeddings } = this.deps;
    if (memoryId) {
      const row = await withOrg(db, orgId, (tx) => findMemoryById(tx, memoryId));
      if (!row) return { reindexed: 0 };
      const [vec] = await embedMemories(embeddings, [row.content]);
      await withOrg(db, orgId, (tx) => setEmbedding(tx, row.id, vec!, embeddings.model));
      return { reindexed: 1 };
    }
    // Whole-org: keyset-paginate over EVERY non-deleted memory (embedded or not)
    // and recompute, so an embedding-model change re-embeds the entire org.
    let total = 0;
    let afterId: string | undefined;
    for (;;) {
      const rows = await withOrg(db, orgId, (tx) => findForReindex(tx, orgId, 200, afterId));
      if (rows.length === 0) break;
      const vectors = await embedMemories(embeddings, rows.map((r) => r.content));
      await withOrg(db, orgId, async (tx) => {
        for (let i = 0; i < rows.length; i++) {
          await setEmbedding(tx, rows[i]!.id, vectors[i]!, embeddings.model);
        }
      });
      total += rows.length;
      afterId = rows[rows.length - 1]!.id;
    }
    return { reindexed: total };
  }

  /** Hard-delete memories soft-deleted before the cutoff (cleanup job). */
  async cleanup(orgId: string, olderThanDays = 30): Promise<CleanupResult> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const purged = await withOrg(this.deps.db, orgId, (tx) =>
      purgeDeletedBefore(tx, orgId, cutoff),
    );
    return { purged };
  }
}

export type { MemoryType };
