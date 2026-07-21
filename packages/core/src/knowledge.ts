import { z } from 'zod';

/**
 * Shared knowledge-base / RAG contracts (Milestone 9). Imported by the API
 * (validation + serialization) and the web app (forms + typed client).
 */

/* -------------------------------- enums ----------------------------------- */

export const IngestStatus = z.enum(['pending', 'processing', 'ready', 'failed']);
export type IngestStatus = z.infer<typeof IngestStatus>;

export const KnowledgeSourceType = z.enum(['file', 'url', 'gdrive', 'notion', 'manual']);
export type KnowledgeSourceType = z.infer<typeof KnowledgeSourceType>;

/**
 * Supported upload formats. Adding a new type here + registering an extractor
 * (apps/workers extraction registry) is all it takes to support it — no core
 * pipeline change. Keys are the server-sniffed MIME types.
 */
export const SUPPORTED_MIME_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
} as const;
export type SupportedFormat = (typeof SUPPORTED_MIME_TYPES)[keyof typeof SUPPORTED_MIME_TYPES];

export const SUPPORTED_EXTENSIONS: Record<string, keyof typeof SUPPORTED_MIME_TYPES> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
};

export function isSupportedMime(mime: string): mime is keyof typeof SUPPORTED_MIME_TYPES {
  return mime in SUPPORTED_MIME_TYPES;
}

/* ----------------------------- collections -------------------------------- */

export const KnowledgeSlug = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(50)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'use lowercase letters, digits and single hyphens');

export const CreateCollectionInput = z.object({
  name: z.string().trim().min(1).max(80),
  slug: KnowledgeSlug.optional(),
  description: z.string().trim().max(500).optional(),
});
export type CreateCollectionInput = z.infer<typeof CreateCollectionInput>;

export const UpdateCollectionInput = z
  .object({
    name: z.string().trim().min(1).max(80),
    slug: KnowledgeSlug,
    description: z.string().trim().max(500).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'no fields to update' });
export type UpdateCollectionInput = z.infer<typeof UpdateCollectionInput>;

export const CollectionView = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  documentCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CollectionView = z.infer<typeof CollectionView>;

/* ------------------------------ documents --------------------------------- */

export const DocumentView = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  collectionId: z.string().uuid().nullable(),
  name: z.string(),
  type: KnowledgeSourceType,
  status: IngestStatus,
  mimeType: z.string().nullable(),
  sizeBytes: z.number().nullable(),
  chunkCount: z.number().int(),
  error: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DocumentView = z.infer<typeof DocumentView>;

/** Create a document from pasted/manual text (no file upload needed). */
export const CreateManualDocumentInput = z.object({
  name: z.string().trim().min(1).max(200),
  content: z.string().min(1).max(1_000_000),
  collectionId: z.string().uuid().optional(),
});
export type CreateManualDocumentInput = z.infer<typeof CreateManualDocumentInput>;

export const ListDocumentsQuery = z.object({
  q: z.string().trim().max(120).optional(),
  status: IngestStatus.optional(),
  collectionId: z.string().uuid().optional(),
  includeDeleted: z.coerce.boolean().default(false),
  sort: z.enum(['createdAt', 'updatedAt', 'name']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListDocumentsQuery = z.infer<typeof ListDocumentsQuery>;

export const PaginatedDocuments = z.object({
  items: z.array(DocumentView),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type PaginatedDocuments = z.infer<typeof PaginatedDocuments>;

export const PaginatedCollections = z.object({
  items: z.array(CollectionView),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type PaginatedCollections = z.infer<typeof PaginatedCollections>;

/* ------------------------------- chunks ----------------------------------- */

export const ChunkView = z.object({
  id: z.string().uuid(),
  chunkIndex: z.number().int(),
  content: z.string(),
  tokenCount: z.number().int(),
  metadata: z.record(z.unknown()),
});
export type ChunkView = z.infer<typeof ChunkView>;

/* ------------------------------ retrieval --------------------------------- */

export const RetrieveQuery = z.object({
  query: z.string().trim().min(1).max(2_000),
  topK: z.coerce.number().int().min(1).max(50).default(8),
  collectionId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  /** Minimum similarity score (0–1) a chunk must clear to be returned. */
  minScore: z.coerce.number().min(0).max(1).default(0),
  /** Approximate max tokens of assembled context (budgeting). */
  maxTokens: z.coerce.number().int().min(256).max(32_000).default(4_000),
});
export type RetrieveQuery = z.infer<typeof RetrieveQuery>;

export const RetrievedChunk = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  sourceName: z.string(),
  chunkIndex: z.number().int(),
  content: z.string(),
  score: z.number(),
  tokenCount: z.number().int(),
  citation: z.number().int(),
  metadata: z.record(z.unknown()),
});
export type RetrievedChunk = z.infer<typeof RetrievedChunk>;

export const Citation = z.object({
  index: z.number().int(),
  sourceId: z.string().uuid(),
  sourceName: z.string(),
  chunkId: z.string().uuid(),
});
export type Citation = z.infer<typeof Citation>;

/**
 * The output every future Conversation/Runtime module consumes: ranked chunks,
 * a citation-annotated context string, and the citation map. No LLM here.
 */
export const RetrievalResult = z.object({
  query: z.string(),
  chunks: z.array(RetrievedChunk),
  context: z.string(),
  citations: z.array(Citation),
  tokenCount: z.number().int(),
});
export type RetrievalResult = z.infer<typeof RetrievalResult>;
