/**
 * Queue names + job payloads shared by producers (API) and consumers (workers).
 * Keeping these here means both sides agree on the contract without a runtime
 * dependency on BullMQ.
 */
export const INGEST_QUEUE = 'ingest';

/** A request to (re)process one knowledge document into chunks + embeddings. */
export interface IngestJobData {
  sourceId: string;
  orgId: string;
}

/** Background memory work (Milestone 11) — never run in a request handler. */
export const MEMORY_QUEUE = 'memory';

export type MemoryTask = 'extract' | 'summarize' | 'embed' | 'reindex' | 'cleanup';

export interface MemoryJobData {
  orgId: string;
  task: MemoryTask;
  /** For extract/summarize — the conversation to work from. */
  conversationId?: string;
  /** For reindex — a specific memory (else the whole org). */
  memoryId?: string;
  /** The user who triggered the work, for audit attribution. */
  actorId?: string;
}
