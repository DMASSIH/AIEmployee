import { getExtractorForMime } from './extract/registry.js';
import { chunkExtract, chunkText, type ChunkOptions } from './chunk.js';
import { embedInBatches, type EmbeddingProvider } from './embeddings/index.js';

export interface ProcessedChunk {
  chunkIndex: number;
  content: string;
  tokenCount: number;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface ProcessResult {
  chunks: ProcessedChunk[];
  /** The embedding model used — persisted per chunk for re-indexing. */
  model: string;
  charCount: number;
}

function zipEmbeddings(
  chunks: { content: string; tokenCount: number; metadata: Record<string, unknown> }[],
  embeddings: number[][],
): ProcessedChunk[] {
  return chunks.map((c, i) => ({
    chunkIndex: i,
    content: c.content,
    tokenCount: c.tokenCount,
    embedding: embeddings[i]!,
    metadata: c.metadata,
  }));
}

/**
 * The full ingest transform for a FILE: extract → chunk → embed. Pure w.r.t.
 * the database (the worker persists the result), so it can be unit-tested with
 * a fixture buffer and the local embedding provider.
 */
export async function processDocument(
  buffer: Buffer,
  mimeType: string,
  provider: EmbeddingProvider,
  options: ChunkOptions = {},
): Promise<ProcessResult> {
  const extractor = getExtractorForMime(mimeType);
  const extracted = await extractor.extract(buffer);
  const chunks = chunkExtract(extracted, options);
  const embeddings = await embedInBatches(provider, chunks.map((c) => c.content));
  return { chunks: zipEmbeddings(chunks, embeddings), model: provider.model, charCount: extracted.text.length };
}

/** Same pipeline for a MANUAL (pasted-text) document — no extraction step. */
export async function processText(
  text: string,
  provider: EmbeddingProvider,
  options: ChunkOptions = {},
): Promise<ProcessResult> {
  const chunks = chunkText(text, options);
  const embeddings = await embedInBatches(provider, chunks.map((c) => c.content));
  return { chunks: zipEmbeddings(chunks, embeddings), model: provider.model, charCount: text.length };
}
