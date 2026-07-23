import { withOrg, schema, eq, and, type Db } from '@aie/db';
import type { EmbeddingProvider } from '@aie/knowledge';
// Reuse the ranking engine for search; CRUD row types live in the local repo.
import { retrieveMemories, toScoredMemory } from '@aie/memory';
import * as repo from './repository.js';
import type { MemoryRow } from './repository.js';
import type { Queue } from 'bullmq';
import type {
  CreateMemoryInput,
  UpdateMemoryInput,
  ListMemoriesQuery,
  PaginatedMemories,
  MemoryView,
  SearchMemoriesInput,
  MemorySearchResult,
  ConversationSummaryView,
  RegenerateSummaryResult,
  MemoryJobData,
} from '@aie/core';
import { writeAudit } from '../../lib/audit.js';

export interface MemoryContext {
  orgId: string;
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface MemoryDeps {
  embeddings: EmbeddingProvider;
  memoryQueue: Queue<MemoryJobData>;
}

const { conversations } = schema;

/* --------------------------------- mapping -------------------------------- */

function toMemoryView(row: MemoryRow): MemoryView {
  return {
    id: row.id,
    organizationId: row.orgId,
    employeeId: row.employeeId ?? null,
    type: row.type,
    content: row.content,
    importance: row.importance,
    accessCount: row.accessCount,
    lastAccessedAt: row.lastAccessedAt ? row.lastAccessedAt.toISOString() : null,
    sourceConversationId: row.sourceConversationId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/* ---------------------------------- reads --------------------------------- */

export async function listMemoriesService(
  db: Db,
  orgId: string,
  query: ListMemoriesQuery,
): Promise<PaginatedMemories> {
  const { rows, total } = await withOrg(db, orgId, (tx) => repo.listMemories(tx, orgId, query));
  return {
    items: rows.map(toMemoryView),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getMemoryService(
  db: Db,
  orgId: string,
  id: string,
): Promise<MemoryView | null> {
  const row = await withOrg(db, orgId, (tx) => repo.findMemoryById(tx, id, { includeDeleted: true }));
  return row ? toMemoryView(row) : null;
}

/**
 * Ranked semantic search for the management UI. Does NOT record access — a user
 * browsing their own memory bank shouldn't skew the frequency/recency signals
 * that the assistant's retrieval relies on.
 */
export async function searchMemoriesService(
  db: Db,
  orgId: string,
  deps: MemoryDeps,
  input: SearchMemoriesInput,
): Promise<MemorySearchResult> {
  const result = await retrieveMemories(db, orgId, deps.embeddings, input.query, {
    topK: input.topK,
    type: input.type,
    employeeId: input.employeeId,
    minScore: input.minScore,
    recordAccess: false,
  });
  return { query: input.query, memories: result.memories.map(toScoredMemory) };
}

/* --------------------------------- writes --------------------------------- */

/**
 * Manually create a memory. Inserted WITHOUT an embedding, then an embed job is
 * enqueued so the vector is computed in the background (never inline). Audited
 * in the same transaction as the insert.
 */
export async function createMemoryService(
  db: Db,
  ctx: MemoryContext,
  deps: MemoryDeps,
  input: CreateMemoryInput,
): Promise<MemoryView> {
  const row = await withOrg(db, ctx.orgId, async (tx) => {
    const created = await repo.insertMemory(tx, {
      orgId: ctx.orgId,
      employeeId: input.employeeId ?? null,
      type: input.type,
      content: input.content,
      importance: input.importance,
      sourceConversationId: input.sourceConversationId ?? null,
      createdBy: ctx.userId,
    });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: 'memory.created',
      targetType: 'memory',
      targetId: created.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { type: created.type, importance: created.importance },
    });
    return created;
  });
  await enqueue(deps, { orgId: ctx.orgId, task: 'embed', actorId: ctx.userId });
  return toMemoryView(row);
}

/**
 * Edit a memory's content/importance. If the content changed, the embedding is
 * now stale, so we clear it and enqueue a reindex to recompute in the background.
 */
export async function updateMemoryService(
  db: Db,
  ctx: MemoryContext,
  deps: MemoryDeps,
  id: string,
  patch: UpdateMemoryInput,
): Promise<MemoryView | null> {
  const outcome = await withOrg(db, ctx.orgId, async (tx) => {
    const existing = await repo.findMemoryById(tx, id);
    if (!existing) return null;
    const contentChanged = patch.content != null && patch.content !== existing.content;
    const row = await repo.updateMemory(tx, id, {
      ...(patch.content != null ? { content: patch.content } : {}),
      ...(patch.importance != null ? { importance: patch.importance } : {}),
      // Stale embedding is cleared; reindex recomputes it.
      ...(contentChanged ? { embedding: null, embeddingModel: null } : {}),
    });
    if (!row) return null;
    await writeAudit(tx, {
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: 'memory.updated',
      targetType: 'memory',
      targetId: id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { contentChanged },
    });
    return { row, contentChanged };
  });
  if (!outcome) return null;
  if (outcome.contentChanged) {
    await enqueue(deps, { orgId: ctx.orgId, task: 'reindex', memoryId: id, actorId: ctx.userId });
  }
  return toMemoryView(outcome.row);
}

export async function deleteMemoryService(
  db: Db,
  ctx: MemoryContext,
  id: string,
): Promise<boolean> {
  return withOrg(db, ctx.orgId, async (tx) => {
    const row = await repo.softDeleteMemory(tx, id);
    if (!row) return false;
    await writeAudit(tx, {
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: 'memory.deleted',
      targetType: 'memory',
      targetId: id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return true;
  });
}

export async function restoreMemoryService(
  db: Db,
  ctx: MemoryContext,
  id: string,
): Promise<MemoryView | null> {
  return withOrg(db, ctx.orgId, async (tx) => {
    const row = await repo.restoreMemory(tx, id);
    if (!row) return null;
    await writeAudit(tx, {
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: 'memory.restored',
      targetType: 'memory',
      targetId: id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return toMemoryView(row);
  });
}

/* --------------------------- conversation summaries ----------------------- */

export async function getConversationSummaryService(
  db: Db,
  orgId: string,
  conversationId: string,
): Promise<ConversationSummaryView | null> {
  return withOrg(db, orgId, async (tx) => {
    const [row] = await tx
      .select({ id: conversations.id, summary: conversations.summary })
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.orgId, orgId)))
      .limit(1);
    if (!row) return null;
    return { conversationId: row.id, summary: row.summary ?? null };
  });
}

/**
 * Kick off a BACKGROUND summary regeneration (the memory worker does the LLM
 * call and persists the result). Returns 404-signal null if the conversation
 * doesn't exist in this org.
 */
export async function regenerateSummaryService(
  db: Db,
  ctx: MemoryContext,
  deps: MemoryDeps,
  conversationId: string,
): Promise<RegenerateSummaryResult | null> {
  const exists = await withOrg(db, ctx.orgId, async (tx) => {
    const [row] = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.orgId, ctx.orgId)))
      .limit(1);
    if (!row) return false;
    await writeAudit(tx, {
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: 'memory.summary_regenerated',
      targetType: 'conversation',
      targetId: conversationId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return true;
  });
  if (!exists) return null;
  await enqueue(deps, {
    orgId: ctx.orgId,
    task: 'summarize',
    conversationId,
    actorId: ctx.userId,
  });
  return { conversationId, enqueued: true };
}

/* --------------------------------- helpers -------------------------------- */

/** Best-effort enqueue — a Redis hiccup must not fail the API write. */
async function enqueue(deps: MemoryDeps, data: MemoryJobData): Promise<void> {
  try {
    await deps.memoryQueue.add(data.task, data, { removeOnComplete: true, removeOnFail: 100 });
  } catch {
    // The write already succeeded; the job is retried by a later trigger.
  }
}
