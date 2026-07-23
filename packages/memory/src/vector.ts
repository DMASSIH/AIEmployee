/** pgvector literal for parameterized SQL: `[0.1,0.2,...]::vector`. */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

/**
 * Cosine similarity in [-1, 1]. Used for in-memory deduplication (comparing
 * candidate embeddings against existing ones) — the DB does its own cosine via
 * the HNSW index for retrieval. Guards against zero vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
