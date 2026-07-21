import { schema, sql, eq, and, ilike, asc, desc, isNull, count, type Tx } from '@aie/db';
import type { ListDocumentsQuery } from '@aie/core';

const { knowledgeCollections, knowledgeSources, knowledgeChunks, files } = schema;

export type CollectionRow = typeof knowledgeCollections.$inferSelect;
export type DocumentRow = typeof knowledgeSources.$inferSelect;
export type FileRow = typeof files.$inferSelect;

/* ------------------------------ collections ------------------------------- */

export async function collectionSlugExists(tx: Tx, orgId: string, slug: string): Promise<boolean> {
  const [row] = await tx
    .select({ id: knowledgeCollections.id })
    .from(knowledgeCollections)
    .where(and(eq(knowledgeCollections.orgId, orgId), eq(knowledgeCollections.slug, slug)))
    .limit(1);
  return !!row;
}

export async function insertCollection(
  tx: Tx,
  values: typeof knowledgeCollections.$inferInsert,
): Promise<CollectionRow> {
  const [row] = await tx.insert(knowledgeCollections).values(values).returning();
  return row!;
}

export async function findCollectionById(tx: Tx, id: string): Promise<CollectionRow | null> {
  const [row] = await tx
    .select()
    .from(knowledgeCollections)
    .where(and(eq(knowledgeCollections.id, id), isNull(knowledgeCollections.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function updateCollection(
  tx: Tx,
  id: string,
  patch: Partial<typeof knowledgeCollections.$inferInsert>,
): Promise<CollectionRow | null> {
  const [row] = await tx
    .update(knowledgeCollections)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(knowledgeCollections.id, id))
    .returning();
  return row ?? null;
}

/** Collections with a live-document count, paginated. */
export async function listCollections(
  tx: Tx,
  orgId: string,
  page: number,
  pageSize: number,
): Promise<{ rows: (CollectionRow & { documentCount: number })[]; total: number }> {
  const where = and(eq(knowledgeCollections.orgId, orgId), isNull(knowledgeCollections.deletedAt));
  const [totalRow] = await tx.select({ n: count() }).from(knowledgeCollections).where(where);

  const docCount = sql<number>`(
    select count(*)::int from ${knowledgeSources} s
    where s.collection_id = ${knowledgeCollections.id} and s.deleted_at is null
  )`;
  const rows = await tx
    .select({ collection: knowledgeCollections, documentCount: docCount })
    .from(knowledgeCollections)
    .where(where)
    .orderBy(asc(knowledgeCollections.name))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    rows: rows.map((r) => ({ ...r.collection, documentCount: Number(r.documentCount) })),
    total: totalRow?.n ?? 0,
  };
}

/* -------------------------------- documents ------------------------------- */

export async function insertFile(tx: Tx, values: typeof files.$inferInsert): Promise<FileRow> {
  const [row] = await tx.insert(files).values(values).returning();
  return row!;
}

export async function insertDocument(
  tx: Tx,
  values: typeof knowledgeSources.$inferInsert,
): Promise<DocumentRow> {
  const [row] = await tx.insert(knowledgeSources).values(values).returning();
  return row!;
}

export async function findDocumentById(
  tx: Tx,
  id: string,
  opts: { includeDeleted?: boolean } = {},
): Promise<DocumentRow | null> {
  const where = opts.includeDeleted
    ? eq(knowledgeSources.id, id)
    : and(eq(knowledgeSources.id, id), isNull(knowledgeSources.deletedAt));
  const [row] = await tx.select().from(knowledgeSources).where(where).limit(1);
  return row ?? null;
}

export async function updateDocument(
  tx: Tx,
  id: string,
  patch: Partial<typeof knowledgeSources.$inferInsert>,
): Promise<DocumentRow | null> {
  const [row] = await tx
    .update(knowledgeSources)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(knowledgeSources.id, id))
    .returning();
  return row ?? null;
}

export async function listDocuments(
  tx: Tx,
  orgId: string,
  query: ListDocumentsQuery,
): Promise<{ rows: DocumentRow[]; total: number }> {
  const filters = [eq(knowledgeSources.orgId, orgId)];
  if (!query.includeDeleted) filters.push(isNull(knowledgeSources.deletedAt));
  if (query.status) filters.push(eq(knowledgeSources.status, query.status));
  if (query.collectionId) filters.push(eq(knowledgeSources.collectionId, query.collectionId));
  if (query.q) filters.push(ilike(knowledgeSources.name, `%${query.q}%`));
  const where = and(...filters);

  const sortCol =
    query.sort === 'name'
      ? knowledgeSources.name
      : query.sort === 'updatedAt'
        ? knowledgeSources.updatedAt
        : knowledgeSources.createdAt;
  const orderBy = query.order === 'asc' ? asc(sortCol) : desc(sortCol);

  const [totalRow] = await tx.select({ n: count() }).from(knowledgeSources).where(where);
  const rows = await tx
    .select()
    .from(knowledgeSources)
    .where(where)
    .orderBy(orderBy)
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  return { rows, total: totalRow?.n ?? 0 };
}

export async function deleteChunksForSource(tx: Tx, orgId: string, sourceId: string): Promise<void> {
  await tx
    .delete(knowledgeChunks)
    .where(and(eq(knowledgeChunks.orgId, orgId), eq(knowledgeChunks.sourceId, sourceId)));
}

export async function findFileById(tx: Tx, id: string): Promise<FileRow | null> {
  const [row] = await tx.select().from(files).where(eq(files.id, id)).limit(1);
  return row ?? null;
}

export async function markFileDeleted(tx: Tx, id: string): Promise<void> {
  await tx.update(files).set({ deletedAt: new Date() }).where(eq(files.id, id));
}
