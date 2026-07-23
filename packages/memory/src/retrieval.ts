import { withOrg, type Db } from '@aie/db';
import type { EmbeddingProvider } from '@aie/knowledge';
import type { MemoryType, ScoredMemory } from '@aie/core';
import { vectorSearchMemories, recordAccess } from './repository.js';
import {
  rankMemories,
  selectWithinTokenBudget,
  type RankingWeights,
  type RankedMemory,
} from './ranking.js';

export interface RetrieveMemoriesOptions {
  /** How many candidates to pull from the vector index before ranking. */
  candidateK?: number;
  /** How many ranked memories to return. */
  topK?: number;
  type?: MemoryType;
  employeeId?: string;
  minScore?: number;
  weights?: RankingWeights;
  /** Cap the combined token size of returned memories (prompt budgeting). */
  maxTokens?: number;
  /** Bump access_count/last_accessed_at for the returned memories. Default true. */
  recordAccess?: boolean;
  now?: Date;
}

export interface RetrieveMemoriesResult {
  query: string;
  memories: RankedMemory[];
  tokenCount: number;
}

/**
 * THE memory retrieval entry point the runtime and API call. Embeds the query,
 * pulls the nearest candidates via pgvector (org-scoped by RLS), applies the
 * full similarity × importance × recency × frequency ranking, trims to a token
 * budget, and (by default) records access so the frequency/recency signals stay
 * live. Over-fetch candidates (candidateK ≫ topK) so ranking can promote a
 * high-importance/recent memory that isn't the single closest vector.
 */
export async function retrieveMemories(
  db: Db,
  orgId: string,
  embeddings: EmbeddingProvider,
  query: string,
  opts: RetrieveMemoriesOptions = {},
): Promise<RetrieveMemoriesResult> {
  const topK = opts.topK ?? 8;
  const candidateK = opts.candidateK ?? Math.max(topK * 4, 24);
  const [queryVector] = await embeddings.embed([query]);

  const result = await withOrg(db, orgId, async (tx) => {
    const candidates = await vectorSearchMemories(tx, orgId, queryVector!, {
      topK: candidateK,
      type: opts.type,
      employeeId: opts.employeeId,
    });

    let ranked = rankMemories(candidates, { weights: opts.weights, now: opts.now });
    if (opts.minScore != null) ranked = ranked.filter((m) => m.score >= opts.minScore!);
    ranked = ranked.slice(0, topK);

    const { selected, tokenCount } =
      opts.maxTokens != null
        ? selectWithinTokenBudget(ranked, opts.maxTokens)
        : { selected: ranked, tokenCount: 0 };

    if (opts.recordAccess !== false && selected.length > 0) {
      await recordAccess(
        tx,
        selected.map((m) => m.id),
      );
    }
    return { selected, tokenCount };
  });

  return { query, memories: result.selected, tokenCount: result.tokenCount };
}

/** Serialize a RankedMemory to the API/core ScoredMemory contract. */
export function toScoredMemory(m: RankedMemory): ScoredMemory {
  return {
    id: m.id,
    type: m.type,
    content: m.content,
    importance: m.importance,
    score: m.score,
    similarity: m.similarity,
    recency: m.recency,
    frequency: m.frequency,
    sourceConversationId: m.sourceConversationId,
  };
}
