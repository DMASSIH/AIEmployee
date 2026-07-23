// Provider abstraction (dependency injection — never import @aie/ai here)
export type {
  MemoryChatProvider,
  MemoryChatRequest,
  MemoryChatResult,
  MemoryChatMessage,
} from './provider.js';

// Vector helpers
export { toVectorLiteral, cosineSimilarity } from './vector.js';

// Ranking (pure, tunable, auditable)
export {
  rankMemories,
  combineScore,
  importanceScore,
  recencyScore,
  frequencyScore,
  selectWithinTokenBudget,
  DEFAULT_WEIGHTS,
  DEFAULT_RECENCY_HALF_LIFE_DAYS,
  DEFAULT_FREQUENCY_SATURATION,
  type RankingWeights,
  type RankingSignals,
  type RankableMemory,
  type RankedMemory,
  type RankOptions,
} from './ranking.js';

// Deduplication
export {
  dedupeCandidates,
  normalizeContent,
  DEFAULT_DEDUP_THRESHOLD,
  type DedupCandidate,
  type DedupExisting,
  type DedupResult,
} from './dedup.js';

// Storage / repository (composed with writeAudit by the API service layer)
export {
  insertMemory,
  insertMemories,
  updateMemory,
  softDeleteMemory,
  restoreMemory,
  setEmbedding,
  recordAccess,
  findMemoryById,
  listMemories,
  vectorSearchMemories,
  findByConversation,
  findWithoutEmbedding,
  findForReindex,
  purgeDeletedBefore,
  type MemoryRow,
  type MemoryInsert,
  type MemoryListResult,
  type VectorCandidate,
  type VectorSearchOptions,
} from './repository.js';

// Retrieval / ranked search
export {
  retrieveMemories,
  toScoredMemory,
  type RetrieveMemoriesOptions,
  type RetrieveMemoriesResult,
} from './retrieval.js';

// Extraction
export {
  extractMemories,
  parseExtraction,
  parseJsonObject,
  type ExtractedMemory,
} from './extraction.js';

// Summarization
export {
  summarizeConversation,
  renderTranscript,
  type TranscriptTurn,
} from './summarization.js';

// Embedding
export { embedMemories } from './embedding.js';

// Engine (background orchestrator — the worker's entry point)
export {
  MemoryEngine,
  type MemoryEngineDeps,
  type ExtractInput,
  type ExtractResult,
  type CleanupResult,
  type ReindexResult,
} from './engine.js';
