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
