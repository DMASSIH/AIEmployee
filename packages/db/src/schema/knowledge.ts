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
  unique,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { employees } from './employees';
import { users } from './users';
import { files } from './files';
import { knowledgeSourceTypeEnum, ingestStatusEnum } from './enums';

/**
 * A named grouping of documents ("Support", "Sales"). Documents
 * (knowledge_sources) optionally belong to one collection; retrieval can be
 * scoped to a collection. Tenant-isolated like everything else (RLS added in
 * the 0005 migration — new tables aren't covered by the 0001 policy loop).
 */
export const knowledgeCollections = pgTable(
  'knowledge_collections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [unique('knowledge_collections_org_slug_uq').on(t.orgId, t.slug)],
);

export const knowledgeSources = pgTable(
  'knowledge_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    /** Optional grouping. Null = ungrouped ("All documents"). */
    collectionId: uuid('collection_id').references(() => knowledgeCollections.id),
    name: text('name').notNull(),
    type: knowledgeSourceTypeEnum('type').notNull(),
    status: ingestStatusEnum('status').notNull().default('pending'),
    /** For type=file. */
    fileId: uuid('file_id').references(() => files.id),
    /** Sniffed MIME of the underlying file (server-side), for extractor routing. */
    mimeType: text('mime_type'),
    /** For type=url. */
    url: text('url'),
    /** Connector config: sync cadence, folder ids, credentials REFERENCE (never tokens). */
    config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    chunkCount: integer('chunk_count').notNull().default(0),
    error: text('error'),
    createdBy: uuid('created_by').references(() => users.id),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('knowledge_sources_org_status_idx').on(t.orgId, t.status),
    index('knowledge_sources_collection_idx').on(t.orgId, t.collectionId),
  ],
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
     * 1536 dims (fits text-embedding-3-small and the local dev provider). A
     * `content_tsv tsvector` GENERATED column + GIN index for hybrid search is
     * added in the RLS/extras SQL migration — queried via raw SQL only, so it
     * isn't modeled here.
     */
    embedding: vector('embedding', { dimensions: 1536 }),
    /** Approx token count of `content` (for retrieval token budgeting). */
    tokenCount: integer('token_count').notNull().default(0),
    /** Which embedding model produced `embedding` — drives re-indexing decisions. */
    embeddingModel: text('embedding_model'),
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
