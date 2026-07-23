import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  smallint,
  vector,
  index,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { employees } from './employees';
import { conversations } from './conversations';
import { users } from './users';
import { memoryTypeEnum } from './enums';

/**
 * Durable memory: stable facts/preferences (semantic) and summaries of past
 * conversations/events (episodic). Retrieval ranks these by similarity ×
 * importance × recency × frequency (see @aie/memory). Tenant-isolated by RLS
 * (policy added in the 0007 migration — new tables aren't covered by 0001).
 */
export const memories = pgTable(
  'memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    /** Null = org-wide memory; set = scoped to one employee. */
    employeeId: uuid('employee_id').references(() => employees.id),
    type: memoryTypeEnum('type').notNull(),
    /** The remembered statement, e.g. "Prefers replies in Swedish." */
    content: text('content').notNull(),
    /** 1 (trivial) … 5 (critical); drives ranking + retention. */
    importance: smallint('importance').notNull().default(3),
    /** Bumped on each retrieval — the frequency signal for ranking. */
    accessCount: integer('access_count').notNull().default(0),
    lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
    /** text-embedding dim 1536 (matches the M9 provider + knowledge_chunks). */
    embedding: vector('embedding', { dimensions: 1536 }),
    embeddingModel: text('embedding_model'),
    /** Which conversation this memory was extracted from (null = manual/import). */
    sourceConversationId: uuid('source_conversation_id').references(() => conversations.id),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    // Scoping/filtering: org + employee + type (retrieval always narrows by these).
    index('memories_org_scope_idx').on(t.orgId, t.employeeId, t.type),
    index('memories_org_source_idx').on(t.orgId, t.sourceConversationId),
  ],
);
