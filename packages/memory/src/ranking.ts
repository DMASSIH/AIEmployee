import { estimateTokens } from '@aie/knowledge';

/**
 * Transparent, tunable memory ranking. A memory's final score is a weighted sum
 * of four signals, each normalized to [0, 1]:
 *
 *   • similarity — semantic closeness to the query (from pgvector cosine)
 *   • importance — the 1..5 human/model-assigned weight
 *   • recency    — how recently the memory was last used (exponential decay)
 *   • frequency  — how often it's been retrieved (log-scaled access count)
 *
 * Keeping this pure and separate from the DB makes the scoring auditable and
 * unit-testable, and lets the API surface the breakdown (see ScoredMemory).
 */
export interface RankingWeights {
  similarity: number;
  importance: number;
  recency: number;
  frequency: number;
}

/** Weights sum to 1 so the combined score stays in [0, 1]. */
export const DEFAULT_WEIGHTS: RankingWeights = {
  similarity: 0.55,
  importance: 0.2,
  recency: 0.15,
  frequency: 0.1,
};

/** Recency half-life: a memory unused for this many days scores ~0.5 on recency. */
export const DEFAULT_RECENCY_HALF_LIFE_DAYS = 30;

/** Access count at which the frequency signal saturates toward 1. */
export const DEFAULT_FREQUENCY_SATURATION = 20;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Map importance 1..5 → [0, 1]. Values outside the range are clamped. */
export function importanceScore(importance: number): number {
  const clamped = Math.max(1, Math.min(5, importance));
  return (clamped - 1) / 4;
}

/**
 * Exponential time decay: 2^(-age / halfLife). 1 when just used, 0.5 after one
 * half-life, approaching 0 for stale memories. `reference` is lastAccessedAt (or
 * createdAt when never accessed).
 */
export function recencyScore(
  reference: Date | null,
  now: Date,
  halfLifeDays = DEFAULT_RECENCY_HALF_LIFE_DAYS,
): number {
  if (!reference) return 0;
  const ageDays = Math.max(0, (now.getTime() - reference.getTime()) / DAY_MS);
  return Math.pow(2, -ageDays / halfLifeDays);
}

/**
 * Log-scaled frequency: log1p(count) / log1p(saturation), clamped to [0, 1]. A
 * few accesses move the needle a lot; diminishing returns after that.
 */
export function frequencyScore(accessCount: number, saturation = DEFAULT_FREQUENCY_SATURATION): number {
  if (accessCount <= 0) return 0;
  const s = Math.log1p(Math.max(1, saturation));
  return Math.min(1, Math.log1p(accessCount) / s);
}

export interface RankingSignals {
  similarity: number;
  importance: number;
  recency: number;
  frequency: number;
}

/** Weighted sum of the four normalized signals → final score in [0, 1]. */
export function combineScore(signals: RankingSignals, weights: RankingWeights = DEFAULT_WEIGHTS): number {
  return (
    signals.similarity * weights.similarity +
    signals.importance * weights.importance +
    signals.recency * weights.recency +
    signals.frequency * weights.frequency
  );
}

/** Everything ranking needs from a candidate memory row. */
export interface RankableMemory {
  id: string;
  type: 'semantic' | 'episodic';
  content: string;
  importance: number;
  accessCount: number;
  lastAccessedAt: Date | null;
  createdAt: Date;
  sourceConversationId: string | null;
  /** Cosine similarity to the query, from the vector search (1 − distance). */
  similarity: number;
}

export interface RankedMemory {
  id: string;
  type: 'semantic' | 'episodic';
  content: string;
  importance: number;
  score: number;
  similarity: number;
  recency: number;
  frequency: number;
  sourceConversationId: string | null;
}

export interface RankOptions {
  weights?: RankingWeights;
  now?: Date;
  halfLifeDays?: number;
  frequencySaturation?: number;
}

/**
 * Score and sort candidate memories, most relevant first. Pure — the caller
 * provides `now` for deterministic tests.
 */
export function rankMemories(candidates: RankableMemory[], opts: RankOptions = {}): RankedMemory[] {
  const weights = opts.weights ?? DEFAULT_WEIGHTS;
  const now = opts.now ?? new Date();
  return candidates
    .map((m) => {
      const recency = recencyScore(m.lastAccessedAt ?? m.createdAt, now, opts.halfLifeDays);
      const frequency = frequencyScore(m.accessCount, opts.frequencySaturation);
      const importance = importanceScore(m.importance);
      const score = combineScore(
        { similarity: m.similarity, importance, recency, frequency },
        weights,
      );
      return {
        id: m.id,
        type: m.type,
        content: m.content,
        importance: m.importance,
        score,
        similarity: m.similarity,
        recency,
        frequency,
        sourceConversationId: m.sourceConversationId,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Greedily take ranked memories until a token budget is exhausted. Order is
 * preserved (highest score first), so the most relevant memories always make it
 * into the prompt. Mirrors knowledge/buildContext's budget discipline.
 */
export function selectWithinTokenBudget<T extends { content: string }>(
  ranked: T[],
  maxTokens: number,
): { selected: T[]; tokenCount: number } {
  const selected: T[] = [];
  let tokenCount = 0;
  for (const m of ranked) {
    const cost = estimateTokens(m.content);
    if (tokenCount + cost > maxTokens && selected.length > 0) break;
    selected.push(m);
    tokenCount += cost;
  }
  return { selected, tokenCount };
}
