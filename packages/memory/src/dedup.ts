import { cosineSimilarity } from './vector.js';

/**
 * Deduplication for extracted memories. The extractor and re-runs over the same
 * conversation produce overlapping facts ("Prefers Swedish" vs "Wants replies in
 * Swedish"); persisting all of them bloats retrieval and skews the frequency
 * signal. We drop a candidate when it's an exact normalized match OR its
 * embedding is near-identical (cosine ≥ threshold) to an already-kept memory.
 */
export const DEFAULT_DEDUP_THRESHOLD = 0.92;

/** Lowercase, collapse whitespace, strip trailing punctuation for exact match. */
export function normalizeContent(content: string): string {
  return content
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?;:,\s]+$/g, '')
    .trim();
}

export interface DedupCandidate {
  content: string;
  embedding: number[] | null;
}

export interface DedupExisting {
  content: string;
  embedding: number[] | null;
}

export interface DedupResult<T> {
  /** Candidates that are genuinely new (kept). */
  unique: T[];
  /** Candidates dropped as duplicates, with the reason. */
  duplicates: { candidate: T; reason: 'exact' | 'semantic' }[];
}

/**
 * Filter `candidates` against `existing` (prior stored memories) AND against
 * each other, so a batch never inserts internal duplicates. Pure and
 * order-stable: the first occurrence wins.
 */
export function dedupeCandidates<T extends DedupCandidate>(
  candidates: T[],
  existing: DedupExisting[] = [],
  threshold = DEFAULT_DEDUP_THRESHOLD,
): DedupResult<T> {
  const keptNorms = new Set(existing.map((e) => normalizeContent(e.content)));
  const keptEmbeddings: number[][] = existing
    .map((e) => e.embedding)
    .filter((e): e is number[] => Array.isArray(e));

  const unique: T[] = [];
  const duplicates: { candidate: T; reason: 'exact' | 'semantic' }[] = [];

  for (const cand of candidates) {
    const norm = normalizeContent(cand.content);
    if (!norm) continue; // empty after normalization — skip silently
    if (keptNorms.has(norm)) {
      duplicates.push({ candidate: cand, reason: 'exact' });
      continue;
    }
    const emb = cand.embedding;
    if (emb && keptEmbeddings.some((e) => cosineSimilarity(emb, e) >= threshold)) {
      duplicates.push({ candidate: cand, reason: 'semantic' });
      continue;
    }
    unique.push(cand);
    keptNorms.add(norm);
    if (emb) keptEmbeddings.push(emb);
  }

  return { unique, duplicates };
}
