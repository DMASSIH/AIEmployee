// Embeddings — provider-agnostic
export {
  createEmbeddingProvider,
  embedInBatches,
  LocalEmbeddingProvider,
  OpenAIEmbeddingProvider,
  type EmbeddingProvider,
  type EmbeddingConfig,
} from './embeddings/index.js';

// Extraction registry (extensible per format)
export {
  registerExtractor,
  getExtractorForFormat,
  getExtractorForMime,
} from './extract/registry.js';
export type { Extractor, ExtractResult } from './extract/types.js';

// Chunking
export { chunkText, chunkExtract, type Chunk, type ChunkOptions } from './chunk.js';

// Tokens
export { estimateTokens } from './tokens.js';

// Storage
export {
  S3StorageProvider,
  storageKey,
  type StorageProvider,
  type S3Config,
} from './storage.js';

// Pipeline
export {
  processDocument,
  processText,
  type ProcessedChunk,
  type ProcessResult,
} from './pipeline.js';

// Retrieval / RAG
export {
  retrieve,
  vectorSearch,
  buildContext,
  type ScoredChunk,
  type VectorSearchOptions,
} from './retrieval.js';
