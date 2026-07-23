import { embedInBatches, type EmbeddingProvider } from '@aie/knowledge';

/**
 * Embed memory contents in bounded batches. Thin wrapper over the M9
 * embedInBatches so the memory engine has one obvious call site and the batch
 * size is tuned here if memory rows ever differ from document chunks.
 */
export async function embedMemories(
  provider: EmbeddingProvider,
  contents: string[],
): Promise<number[][]> {
  if (contents.length === 0) return [];
  return embedInBatches(provider, contents, 64);
}
