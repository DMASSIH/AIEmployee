import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  bigint,
  vector,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { employees } from './employees';
import { files } from './files';
import { knowledgeSourceTypeEnum, ingestStatusEnum } from './enums';

export const knowledgeSources = pgTable(
  'knowledge_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    type: knowledgeSourceTypeEnum('type').notNull(),
    status: ingestStatusEnum('status').notNull().default('pending'),
    /** For type=file. */
    fileId: uuid('file_id').references(() => files.id),
    /** For type=url. */
    url: text('url'),
    /** Connector config: sync cadence, folder ids, credentials REFERENCE (never tokens). */
    config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    chunkCount: integer('chunk_count').notNull().default(0),
    error: text('error'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('knowledge_sources_org_status_idx').on(t.orgId, t.status)],
);

export const knowledgeChunks = pgTable(
  'knowledge_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => knowledgeSources.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    /** Chunk text, prefixed with its heading breadcrumb at ingest time. */
    content: text('content').notNull(),
    /**
     * text-embedding-3-small, 1536 dims. A `content_tsv tsvector` GENERATED
     * column + GIN index for hybrid search is added in the RLS/extras SQL
     * migration — it's queried via raw SQL only, so it isn't modeled here.
     */
    embedding: vector('embedding', { dimensions: 1536 }),
    /** { page: 4, heading: "Refund policy", sourceName: "handbook.pdf" } */
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [
    index('knowledge_chunks_source_idx').on(t.orgId, t.sourceId, t.chunkIndex),
    index('knowledge_chunks_embedding_idx').using(
      'hnsw',
      t.embedding.op('vector_cosine_ops'),
    ),
  ],
);

/** The "training assignment": which employees are trained on which sources. */
export const employeeKnowledge = pgTable(
  'employee_knowledge',
  {
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => knowledgeSources.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
  },
  (t) => [primaryKey({ columns: [t.employeeId, t.sourceId] })],
);
