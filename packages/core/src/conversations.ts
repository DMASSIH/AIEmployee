import { z } from 'zod';
import { Citation } from './knowledge.js';

/**
 * Conversation + message + streaming contracts (Milestone 10). Shared by the API
 * (validation + serialization) and the web app (typed client + SSE parsing).
 */

export const MessageRole = z.enum(['user', 'assistant', 'system', 'tool']);
export type MessageRole = z.infer<typeof MessageRole>;

export const ConversationStatus = z.enum(['open', 'resolved', 'escalated']);
export type ConversationStatus = z.infer<typeof ConversationStatus>;

/* ------------------------------ conversations ----------------------------- */

export const CreateConversationInput = z.object({
  employeeId: z.string().uuid(),
  title: z.string().trim().max(200).optional(),
  /** Optional first user message (creates + sends in one step). */
  message: z.string().trim().min(1).max(10_000).optional(),
});
export type CreateConversationInput = z.infer<typeof CreateConversationInput>;

export const UpdateConversationInput = z
  .object({
    title: z.string().trim().min(1).max(200),
    status: ConversationStatus,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'no fields to update' });
export type UpdateConversationInput = z.infer<typeof UpdateConversationInput>;

export const SendMessageInput = z.object({
  content: z.string().trim().min(1).max(10_000),
});
export type SendMessageInput = z.infer<typeof SendMessageInput>;

export const ConversationView = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  employeeId: z.string().uuid(),
  employeeName: z.string().nullable(),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  status: ConversationStatus,
  channel: z.string(),
  messageCount: z.number().int(),
  lastMessageAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ConversationView = z.infer<typeof ConversationView>;

export const MessageView = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: MessageRole,
  content: z.string(),
  citations: z.array(Citation),
  model: z.string().nullable(),
  promptTokens: z.number().int().nullable(),
  completionTokens: z.number().int().nullable(),
  totalTokens: z.number().int().nullable(),
  costUsd: z.number().nullable(),
  latencyMs: z.number().int().nullable(),
  createdAt: z.string(),
});
export type MessageView = z.infer<typeof MessageView>;

export const ListConversationsQuery = z.object({
  q: z.string().trim().max(120).optional(),
  employeeId: z.string().uuid().optional(),
  status: ConversationStatus.optional(),
  includeDeleted: z.coerce.boolean().default(false),
  sort: z.enum(['createdAt', 'updatedAt', 'lastMessageAt']).default('lastMessageAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListConversationsQuery = z.infer<typeof ListConversationsQuery>;

export const PaginatedConversations = z.object({
  items: z.array(ConversationView),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type PaginatedConversations = z.infer<typeof PaginatedConversations>;

/* ------------------------------- token usage ------------------------------ */

export const UsageInfo = z.object({
  model: z.string(),
  promptTokens: z.number().int(),
  completionTokens: z.number().int(),
  totalTokens: z.number().int(),
  costUsd: z.number(),
  latencyMs: z.number().int(),
});
export type UsageInfo = z.infer<typeof UsageInfo>;

/* ---------------------------- streaming (SSE) ----------------------------- */

/**
 * The wire contract for the streaming chat endpoint. Each SSE `data:` line is a
 * JSON-encoded StreamEvent. Provider/runtime emit these; the web client renders
 * them incrementally. Kept here so both sides parse the same shape.
 */
export type StreamEvent =
  | { type: 'start'; conversationId: string; userMessageId: string; assistantMessageId: string }
  | { type: 'token'; text: string }
  | { type: 'citations'; citations: Citation[] }
  | { type: 'done'; usage: UsageInfo }
  | { type: 'error'; error: string };
