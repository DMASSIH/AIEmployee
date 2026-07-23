import {
  schema,
  eq,
  and,
  ilike,
  asc,
  desc,
  isNull,
  isNotNull,
  count,
  type Tx,
} from '@aie/db';
import type { ListMemoriesQuery } from '@aie/core';

const { memories } = schema;

export type MemoryRow = typeof memories.$inferSelect;
export type MemoryInsert = typeof memories.$inferInsert;

/**
 * Thin in-package CRUD for the Memory API module. Kept here (rather than reusing
 * @aie/memory's repository) so the drizzle `$inferSelect` row type resolves in
 * THIS package — the same reason conversations/knowledge own their repositories.
 * The heavy, reusable logic (ranked retrieval, extraction, dedup) still lives in
 * @aie/memory; this is only the trivial persistence the API composes with audit.
 */

export async function insertMemory(tx: Tx, values: MemoryInsert): Promise<MemoryRow> {
  const [row] = await tx.insert(memories).values(values).returning();
  return row!;
}

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

export async function listMemories(
  tx: Tx,
  orgId: string,
  query: ListMemoriesQuery,
): Promise<{ rows: MemoryRow[]; total: number }> {
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
