import { schema, sql, eq, and, ilike, asc, desc, isNull, count, type Tx } from '@aie/db';
import type { ListConversationsQuery } from '@aie/core';

const { conversations, messages, employees, usageCounters } = schema;

export type ConversationRow = typeof conversations.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;

/* ----------------------------- conversations ------------------------------ */

export async function insertConversation(
  tx: Tx,
  values: typeof conversations.$inferInsert,
): Promise<ConversationRow> {
  const [row] = await tx.insert(conversations).values(values).returning();
  return row!;
}

export async function findConversationById(
  tx: Tx,
  id: string,
  opts: { includeDeleted?: boolean } = {},
): Promise<ConversationRow | null> {
  const where = opts.includeDeleted
    ? eq(conversations.id, id)
    : and(eq(conversations.id, id), isNull(conversations.deletedAt));
  const [row] = await tx.select().from(conversations).where(where).limit(1);
  return row ?? null;
}

export async function updateConversation(
  tx: Tx,
  id: string,
  patch: Partial<typeof conversations.$inferInsert>,
): Promise<ConversationRow | null> {
  const [row] = await tx
    .update(conversations)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(conversations.id, id))
    .returning();
  return row ?? null;
}

export interface ConversationListRow extends ConversationRow {
  employeeName: string | null;
  messageCount: number;
}

export async function listConversations(
  tx: Tx,
  orgId: string,
  query: ListConversationsQuery,
): Promise<{ rows: ConversationListRow[]; total: number }> {
  const filters = [eq(conversations.orgId, orgId)];
  if (!query.includeDeleted) filters.push(isNull(conversations.deletedAt));
  if (query.employeeId) filters.push(eq(conversations.employeeId, query.employeeId));
  if (query.status) filters.push(eq(conversations.status, query.status));
  if (query.q) filters.push(ilike(conversations.title, `%${query.q}%`));
  const where = and(...filters);

  const sortCol =
    query.sort === 'createdAt'
      ? conversations.createdAt
      : query.sort === 'updatedAt'
        ? conversations.updatedAt
        : conversations.lastMessageAt;
  // NULLS LAST so unanswered convs don't dominate a desc lastMessageAt sort.
  const orderBy = query.order === 'asc' ? asc(sortCol) : desc(sortCol);

  const [totalRow] = await tx.select({ n: count() }).from(conversations).where(where);

  const msgCount = sql<number>`(
    select count(*)::int from ${messages} m where m.conversation_id = ${conversations.id}
  )`;
  const rows = await tx
    .select({ conversation: conversations, employeeName: employees.name, messageCount: msgCount })
    .from(conversations)
    .leftJoin(employees, eq(employees.id, conversations.employeeId))
    .where(where)
    .orderBy(orderBy)
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  return {
    rows: rows.map((r) => ({
      ...r.conversation,
      employeeName: r.employeeName ?? null,
      messageCount: Number(r.messageCount),
    })),
    total: totalRow?.n ?? 0,
  };
}

export async function conversationMessageCount(tx: Tx, conversationId: string): Promise<number> {
  const [row] = await tx
    .select({ n: count() })
    .from(messages)
    .where(eq(messages.conversationId, conversationId));
  return row?.n ?? 0;
}

/* -------------------------------- messages -------------------------------- */

export async function insertMessage(
  tx: Tx,
  values: typeof messages.$inferInsert,
): Promise<MessageRow> {
  const [row] = await tx.insert(messages).values(values).returning();
  return row!;
}

export async function listMessages(tx: Tx, conversationId: string): Promise<MessageRow[]> {
  return tx
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
}

/** Most recent N messages (chronological), for short-term memory. */
export async function recentMessages(
  tx: Tx,
  conversationId: string,
  limit: number,
): Promise<MessageRow[]> {
  const rows = await tx
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  return rows.reverse();
}

/* --------------------------------- usage ---------------------------------- */

/** Increment a monthly usage counter (upsert on the org/period/metric PK). */
export async function incrementUsage(
  tx: Tx,
  orgId: string,
  metric: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) return;
  const period = new Date();
  period.setUTCDate(1);
  const periodStr = period.toISOString().slice(0, 10);
  await tx
    .insert(usageCounters)
    .values({ orgId, period: periodStr, metric, used: amount })
    .onConflictDoUpdate({
      target: [usageCounters.orgId, usageCounters.period, usageCounters.metric],
      set: { used: sql`${usageCounters.used} + ${amount}` },
    });
}
