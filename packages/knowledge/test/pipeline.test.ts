import { describe, it, expect } from 'vitest';
import { estimateTokens } from '../src/tokens.js';
import { LocalEmbeddingProvider } from '../src/embeddings/local.js';
import { chunkText } from '../src/chunk.js';
import { buildContext, type ScoredChunk } from '../src/retrieval.js';
import { processText } from '../src/pipeline.js';

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot; // vectors are L2-normalized
}

describe('tokens', () => {
  it('estimates ~4 chars per token', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('a'.repeat(400))).toBe(100);
  });
});

describe('LocalEmbeddingProvider', () => {
  const provider = new LocalEmbeddingProvider();

  it('produces deterministic 1536-dim unit vectors', async () => {
    const [a] = await provider.embed(['refund policy for damaged items']);
    const [b] = await provider.embed(['refund policy for damaged items']);
    expect(a).toHaveLength(1536);
    expect(a).toEqual(b);
    expect(Math.abs(cosine(a!, a!) - 1)).toBeLessThan(1e-9);
  });

  it('ranks similar text higher than unrelated text', async () => {
    const [query, related, unrelated] = await provider.embed([
      'how do I get a refund',
      'refund requests are processed within 7 days',
      'the mitochondria is the powerhouse of the cell',
    ]);
    expect(cosine(query!, related!)).toBeGreaterThan(cosine(query!, unrelated!));
  });
});

describe('chunkText', () => {
  it('carries the heading breadcrumb into chunks', () => {
    const text = '# Policies\n\n## Refunds\n\nRefunds are processed within 7 days of approval.';
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]!.content).toContain('Policies › Refunds');
    expect(chunks[0]!.metadata.heading).toBe('Policies › Refunds');
  });

  it('respects the token budget, splitting long input into multiple chunks', () => {
    const para = 'Sentence number ' + 'x '.repeat(20) + '. ';
    const long = para.repeat(80);
    const chunks = chunkText(long, { maxTokens: 100, overlapTokens: 10 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.tokenCount).toBeLessThanOrEqual(140); // budget + overlap slack
  });
});

describe('buildContext', () => {
  const scored: ScoredChunk[] = [0, 1, 2].map((i) => ({
    id: `00000000-0000-0000-0000-00000000000${i}`,
    sourceId: '11111111-1111-1111-1111-111111111111',
    sourceName: 'handbook.pdf',
    chunkIndex: i,
    content: `chunk ${i} content`,
    tokenCount: 40,
    score: 0.9 - i * 0.1,
    metadata: {},
  }));

  it('numbers citations and annotates the context', () => {
    const { context, citations, chunks } = buildContext(scored, 4000);
    expect(chunks).toHaveLength(3);
    expect(citations.map((c) => c.index)).toEqual([1, 2, 3]);
    expect(context).toContain('[1] (handbook.pdf)');
    expect(context).toContain('[3] (handbook.pdf)');
  });

  it('enforces the token budget', () => {
    const { chunks, tokenCount } = buildContext(scored, 50); // only the first ~40-token chunk fits
    expect(chunks).toHaveLength(1);
    expect(tokenCount).toBeLessThanOrEqual(50);
  });
});

describe('processText pipeline', () => {
  it('chunks and embeds pasted text end to end', async () => {
    const result = await processText(
      'Our refund policy allows returns within 30 days. Damaged items are replaced immediately.',
      new LocalEmbeddingProvider(),
    );
    expect(result.model).toBe('local-hash-v1');
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks[0]!.embedding).toHaveLength(1536);
    expect(result.chunks[0]!.chunkIndex).toBe(0);
  });
});
