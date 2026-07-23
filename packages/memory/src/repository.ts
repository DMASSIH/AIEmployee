import {
  schema,
  sql,
  eq,
  and,
  ilike,
  asc,
  desc,
  isNull,
  isNotNull,
  count,
  inArray,
  type Tx,
} from '@aie/db';
import type { ListMemoriesQuery, MemoryType } from '@aie/core';
import { toVectorLiteral } from './vector.js';

const { memories } = schema;

export type MemoryRow = typeof memories.$inferSelect;
export type MemoryInsert = typeof memories.$inferInsert;

/* -------------------------------- writes ---------------------------------- */

export async function insertMemory(tx: Tx, values: MemoryInsert): Promise<MemoryRow> {
  const [row] = await tx.insert(memories).values(values).returning();
  return row!;
}

export async function insertMemories(tx: Tx, values: MemoryInsert[]): Promise<MemoryRow[]> {
  if (values.length === 0) return [];
  return tx.insert(memories).values(values).returning();
}

export async function updateMemory(
  tx: Tx,
  id: string,
  patch: Partial<MemoryInsert>,
): Promise<MemoryRow | null> {
  const [row] = await tx
    .update(memories)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(memories.id, id))
    .returning();
  return row ?? null;
}

/** Soft delete — memories are recoverable (see restoreMemory). */
export async function softDeleteMemory(tx: Tx, id: string): Promise<MemoryRow | null> {
  const [row] = await tx
    .update(memories)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(memories.id, id), isNull(memories.deletedAt)))
    .returning();
  return row ?? null;
}

export async function restoreMemory(tx: Tx, id: string): Promise<MemoryRow | null> {
  const [row] = await tx
    .update(memories)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(memories.id, id), isNotNull(memories.deletedAt)))
    .returning();
  return row ?? null;
}

/** Store a freshly computed embedding (used by the embed worker + reindex). */
export async function setEmbedding(
  tx: Tx,
  id: string,
  embedding: number[],
  model: string,
): Promise<void> {
  await tx
    .update(memories)
    .set({
      embedding: sql`${toVectorLiteral(embedding)}::vector`,
      embeddingModel: model,
      updatedAt: new Date(),
    })
    .where(eq(memories.id, id));
}

/**
 * Bump the frequency signal after a memory is surfaced to the model. Fire this
 * for the memories that actually made it into a prompt so recency + frequency
 * reflect real use. Batched by id to keep it a single statement.
 */
export async function recordAccess(tx: Tx, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await tx
    .update(memories)
    .set({ accessCount: sql`${memories.accessCount} + 1`, lastAccessedAt: new Date() })
    .where(inArray(memories.id, ids));
}

/* -------------------------------- reads ----------------------------------- */

export async function findMemoryById(
  tx: Tx,
  id: string,
  opts: { includeDeleted?: boolean } = {},
): Promise<MemoryRow | null> {
  const where = opts.includeDeleted
    ? eq(memories.id, id)
    : and(eq(memories.id, id), isNull(memories.deletedAt));
  const [row] = await tx.select().from(memories).where(where).limit(1);
  return row ?? null;
}

export interface MemoryListResult {
  rows: MemoryRow[];
  total: number;
}

/** Paginated, filterable listing for the management UI (no vector search). */
export async function listMemories(
  tx: Tx,
  orgId: string,
  query: ListMemoriesQuery,
): Promise<MemoryListResult> {
  const filters = [eq(memories.orgId, orgId)];
  if (!query.includeDeleted) filters.push(isNull(memories.deletedAt));
  if (query.type) filters.push(eq(memories.type, query.type));
  if (query.employeeId) filters.push(eq(memories.employeeId, query.employeeId));
  if (query.q) filters.push(ilike(memories.content, `%${query.q}%`));
  const where = and(...filters);

  const sortCol =
    query.sort === 'updatedAt'
      ? memories.updatedAt
      : query.sort === 'importance'
        ? memories.importance
        : query.sort === 'accessCount'
          ? memories.accessCount
          : memories.createdAt;
  const orderBy = query.order === 'asc' ? asc(sortCol) : desc(sortCol);

  const [totalRow] = await tx.select({ n: count() }).from(memories).where(where);
  const rows = await tx
    .select()
    .from(memories)
    .where(where)
    .orderBy(orderBy)
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  return { rows, total: totalRow?.n ?? 0 };
}

/**
 * A candidate row from vector search, with its cosine similarity. Scoped to the
 * org by RLS (runs inside withOrg). `<=>` is cosine distance; similarity =
 * 1 − distance. Only non-deleted, embedded rows participate.
 */
export interface VectorCandidate {
  id: string;
  type: MemoryType;
  content: string;
  importance: number;
  accessCount: number;
  lastAccessedAt: Date | null;
  createdAt: Date;
  sourceConversationId: string | null;
  similarity: number;
}

export interface VectorSearchOptions {
  topK: number;
  type?: MemoryType;
  employeeId?: string;
  /** Include org-wide memories (employee_id IS NULL) alongside employee-scoped. */
  includeOrgWide?: boolean;
}

export async function vectorSearchMemories(
  tx: Tx,
  orgId: string,
  queryVector: number[],
  opts: VectorSearchOptions,
): Promise<VectorCandidate[]> {
  const vec = toVectorLiteral(queryVector);
  const filters = [
    sql`org_id = ${orgId}`,
    sql`deleted_at is null`,
    sql`embedding is not null`,
  ];
  if (opts.type) filters.push(sql`type = ${opts.type}`);
  if (opts.employeeId) {
    filters.push(
      opts.includeOrgWide === false
        ? sql`employee_id = ${opts.employeeId}`
        : sql`(employee_id = ${opts.employeeId} or employee_id is null)`,
    );
  }
  let where = filters[0]!;
  for (let i = 1; i < filters.length; i++) where = sql`${where} and ${filters[i]}`;

  const rows = await tx.execute(sql`
    select
      id,
      type,
      content,
      importance,
      access_count           as "accessCount",
      last_accessed_at       as "lastAccessedAt",
      created_at             as "createdAt",
      source_conversation_id as "sourceConversationId",
      1 - (embedding <=> ${vec}::vector) as similarity
    from memories
    where ${where}
    order by embedding <=> ${vec}::vector asc
    limit ${opts.topK}
  `);

  return (rows as unknown as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    type: r.type as MemoryType,
    content: String(r.content),
    importance: Number(r.importance),
    accessCount: Number(r.accessCount),
    lastAccessedAt: r.lastAccessedAt ? new Date(r.lastAccessedAt as string | Date) : null,
    createdAt: new Date(r.createdAt as string | Date),
    sourceConversationId: (r.sourceConversationId as string | null) ?? null,
    similarity: Number(r.similarity),
  }));
}

/**
 * Memories from a given source conversation — used by dedup during extraction
 * (compare new candidates against what that conversation already produced).
 */
export async function findByConversation(
  tx: Tx,
  orgId: string,
  conversationId: string,
): Promise<MemoryRow[]> {
  return tx
    .select()
    .from(memories)
    .where(
      and(
        eq(memories.orgId, orgId),
        eq(memories.sourceConversationId, conversationId),
        isNull(memories.deletedAt),
      ),
    );
}

/** Rows missing an embedding (embed worker + reindex targets). */
export async function findWithoutEmbedding(
  tx: Tx,
  orgId: string,
  limit = 100,
): Promise<MemoryRow[]> {
  return tx
    .select()
    .from(memories)
    .where(and(eq(memories.orgId, orgId), isNull(memories.embedding), isNull(memories.deletedAt)))
    .limit(limit);
}

/**
 * Non-deleted memories for a full reindex, keyset-paginated by id so a
 * concurrent embedding update never causes an offset to skip or repeat rows.
 * Pass the last returned id as `afterId` to fetch the next page.
 */
export async function findForReindex(
  tx: Tx,
  orgId: string,
  limit: number,
  afterId?: string,
): Promise<{ id: string; content: string }[]> {
  const filters = [eq(memories.orgId, orgId), isNull(memories.deletedAt)];
  if (afterId) filters.push(sql`${memories.id} > ${afterId}`);
  return tx
    .select({ id: memories.id, content: memories.content })
    .from(memories)
    .where(and(...filters))
    .orderBy(asc(memories.id))
    .limit(limit);
}

/**
 * Purge soft-deleted memories older than the cutoff (cleanup worker). Returns
 * the number of rows hard-deleted.
 */
export async function purgeDeletedBefore(tx: Tx, orgId: string, cutoff: Date): Promise<number> {
  const rows = await tx
    .delete(memories)
    .where(
      and(eq(memories.orgId, orgId), isNotNull(memories.deletedAt), sql`deleted_at < ${cutoff}`),
    )
    .returning({ id: memories.id });
  return rows.length;
}
