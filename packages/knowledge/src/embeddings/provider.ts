/**
 * The ONLY embedding contract the rest of the app knows about. Nothing outside
 * this folder imports a concrete provider — swap the implementation (local ↔
 * OpenAI ↔ anything) without touching ingestion, retrieval, or the API.
 */
export interface EmbeddingProvider {
  /** Stable identifier stored on each chunk; drives re-indexing decisions. */
  readonly model: string;
  /** Vector dimensionality. Must match the DB column (1536). */
  readonly dimensions: number;
  /** Embed a batch of texts, preserving order. */
  embed(texts: string[]): Promise<number[][]>;
}

/**
 * Embed many texts in bounded batches — providers (and HTTP APIs) have request
 * size limits, and batching keeps memory flat for large documents.
 */
export async function embedInBatches(
  provider: EmbeddingProvider,
  texts: string[],
  batchSize = 64,
): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    out.push(...(await provider.embed(batch)));
  }
  return out;
}
