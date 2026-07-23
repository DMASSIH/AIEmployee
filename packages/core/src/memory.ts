import { z } from 'zod';

/**
 * Memory & Context contracts (Milestone 11). Shared by the API (validation +
 * serialization), the @aie/memory engine, and the web client.
 */

export const MemoryType = z.enum(['semantic', 'episodic']);
export type MemoryType = z.infer<typeof MemoryType>;

/** 1 (trivial) … 5 (critical). Drives retention + ranking. */
export const Importance = z.number().int().min(1).max(5);

export const MemoryView = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  employeeId: z.string().uuid().nullable(),
  type: MemoryType,
  content: z.string(),
  importance: z.number().int(),
  accessCount: z.number().int(),
  lastAccessedAt: z.string().nullable(),
  sourceConversationId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MemoryView = z.infer<typeof MemoryView>;

export const CreateMemoryInput = z.object({
  content: z.string().trim().min(1).max(2_000),
  type: MemoryType.default('semantic'),
  importance: Importance.default(3),
  employeeId: z.string().uuid().optional(),
  sourceConversationId: z.string().uuid().optional(),
});
export type CreateMemoryInput = z.infer<typeof CreateMemoryInput>;

export const UpdateMemoryInput = z
  .object({
    content: z.string().trim().min(1).max(2_000),
    importance: Importance,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'no fields to update' });
export type UpdateMemoryInput = z.infer<typeof UpdateMemoryInput>;

export const ListMemoriesQuery = z.object({
  q: z.string().trim().max(200).optional(),
  type: MemoryType.optional(),
  employeeId: z.string().uuid().optional(),
  includeDeleted: z.coerce.boolean().default(false),
  sort: z.enum(['createdAt', 'updatedAt', 'importance', 'accessCount']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListMemoriesQuery = z.infer<typeof ListMemoriesQuery>;

export const PaginatedMemories = z.object({
  items: z.array(MemoryView),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type PaginatedMemories = z.infer<typeof PaginatedMemories>;

/** Semantic memory search (vector + importance/recency/frequency ranking). */
export const SearchMemoriesInput = z.object({
  query: z.string().trim().min(1).max(2_000),
  topK: z.coerce.number().int().min(1).max(50).default(10),
  type: MemoryType.optional(),
  employeeId: z.string().uuid().optional(),
  minScore: z.coerce.number().min(0).max(1).default(0),
});
export type SearchMemoriesInput = z.infer<typeof SearchMemoriesInput>;

/** A memory with its ranking breakdown (transparent, tunable scoring). */
export const ScoredMemory = z.object({
  id: z.string().uuid(),
  type: MemoryType,
  content: z.string(),
  importance: z.number().int(),
  score: z.number(),
  similarity: z.number(),
  recency: z.number(),
  frequency: z.number(),
  sourceConversationId: z.string().uuid().nullable(),
});
export type ScoredMemory = z.infer<typeof ScoredMemory>;

export const MemorySearchResult = z.object({
  query: z.string(),
  memories: z.array(ScoredMemory),
});
export type MemorySearchResult = z.infer<typeof MemorySearchResult>;

/** A conversation's rolling summary (episodic long-context management). */
export const ConversationSummaryView = z.object({
  conversationId: z.string().uuid(),
  summary: z.string().nullable(),
});
export type ConversationSummaryView = z.infer<typeof ConversationSummaryView>;

/** Ack for background summary regeneration (the worker does the actual work). */
export const RegenerateSummaryResult = z.object({
  conversationId: z.string().uuid(),
  enqueued: z.boolean(),
});
export type RegenerateSummaryResult = z.infer<typeof RegenerateSummaryResult>;
