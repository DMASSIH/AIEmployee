import type { EmbeddingProvider } from './provider.js';

const DIMS = 1536;

/** FNV-1a 32-bit — fast, deterministic, dependency-free. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Deterministic, in-process embeddings via the hashing trick: each token is
 * hashed into a bucket with a signed weight, then the vector is L2-normalized.
 * Texts that share vocabulary land close in cosine space, so similarity search
 * returns genuinely relevant chunks — no network, no API key, reproducible in
 * tests. NOT for production relevance; swap in a real provider via env.
 */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly model = 'local-hash-v1';
  readonly dimensions = DIMS;

  embed(texts: string[]): Promise<number[][]> {
    return Promise.resolve(texts.map((t) => embedOne(t)));
  }
}

function embedOne(text: string): number[] {
  const v = new Array<number>(DIMS).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const tok of tokens) {
    const idx = fnv1a(tok) % DIMS;
    const sign = fnv1a(tok + '') % 2 === 0 ? 1 : -1;
    v[idx]! += sign;
  }
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < DIMS; i++) v[i]! /= norm;
  return v;
}
