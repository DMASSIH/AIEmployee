import { describe, it, expect } from 'vitest';
import {
  importanceScore,
  recencyScore,
  frequencyScore,
  combineScore,
  rankMemories,
  selectWithinTokenBudget,
  DEFAULT_WEIGHTS,
  type RankableMemory,
} from '../src/ranking.js';
import { cosineSimilarity } from '../src/vector.js';
import { dedupeCandidates, normalizeContent } from '../src/dedup.js';
import { parseExtraction, parseJsonObject } from '../src/extraction.js';
import { renderTranscript } from '../src/summarization.js';

const NOW = new Date('2026-07-23T00:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

describe('ranking signals', () => {
  it('normalizes importance 1..5 to [0,1] and clamps', () => {
    expect(importanceScore(1)).toBe(0);
    expect(importanceScore(3)).toBe(0.5);
    expect(importanceScore(5)).toBe(1);
    expect(importanceScore(0)).toBe(0);
    expect(importanceScore(9)).toBe(1);
  });

  it('decays recency by half every half-life', () => {
    expect(recencyScore(NOW, NOW, 30)).toBeCloseTo(1, 5);
    expect(recencyScore(new Date(NOW.getTime() - 30 * DAY), NOW, 30)).toBeCloseTo(0.5, 5);
    expect(recencyScore(new Date(NOW.getTime() - 60 * DAY), NOW, 30)).toBeCloseTo(0.25, 5);
    expect(recencyScore(null, NOW)).toBe(0);
  });

  it('log-scales frequency with saturation', () => {
    expect(frequencyScore(0)).toBe(0);
    expect(frequencyScore(1)).toBeGreaterThan(0);
    expect(frequencyScore(1000)).toBeLessThanOrEqual(1);
    expect(frequencyScore(20, 20)).toBeCloseTo(1, 5);
  });

  it('combineScore is a weighted sum in [0,1]', () => {
    const s = combineScore({ similarity: 1, importance: 1, recency: 1, frequency: 1 }, DEFAULT_WEIGHTS);
    expect(s).toBeCloseTo(1, 5);
    const z = combineScore({ similarity: 0, importance: 0, recency: 0, frequency: 0 });
    expect(z).toBe(0);
  });
});

describe('rankMemories', () => {
  const base: Omit<RankableMemory, 'id' | 'similarity' | 'importance'> = {
    type: 'semantic',
    content: 'x',
    accessCount: 0,
    lastAccessedAt: NOW,
    createdAt: NOW,
    sourceConversationId: null,
  };

  it('sorts by combined score, letting importance/recency break similarity ties', () => {
    const ranked = rankMemories(
      [
        { ...base, id: 'a', similarity: 0.8, importance: 1 },
        { ...base, id: 'b', similarity: 0.8, importance: 5 },
      ],
      { now: NOW },
    );
    expect(ranked[0]!.id).toBe('b'); // higher importance wins the tie
    expect(ranked[0]!.score).toBeGreaterThan(ranked[1]!.score);
  });

  it('surfaces the ranking breakdown', () => {
    const [m] = rankMemories([{ ...base, id: 'a', similarity: 0.5, importance: 3 }], { now: NOW });
    expect(m).toMatchObject({ similarity: 0.5, importance: 3 });
    expect(m!.recency).toBeCloseTo(1, 5);
    expect(m!.frequency).toBe(0);
  });
});

describe('selectWithinTokenBudget', () => {
  it('greedily fills the budget in order, keeping at least one', () => {
    const items = [
      { content: 'a'.repeat(400) }, // ~100 tokens
      { content: 'b'.repeat(400) },
      { content: 'c'.repeat(400) },
    ];
    const { selected, tokenCount } = selectWithinTokenBudget(items, 150);
    expect(selected).toHaveLength(1);
    expect(tokenCount).toBeLessThanOrEqual(150);
  });

  it('always includes the first item even if it overflows', () => {
    const { selected } = selectWithinTokenBudget([{ content: 'z'.repeat(4000) }], 10);
    expect(selected).toHaveLength(1);
  });
});

describe('cosineSimilarity', () => {
  it('is 1 for identical, 0 for orthogonal, and guards zero vectors', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1, 9);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 9);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe('dedupeCandidates', () => {
  it('drops exact normalized duplicates against existing', () => {
    const { unique, duplicates } = dedupeCandidates(
      [{ content: 'Prefers Swedish.', embedding: null }],
      [{ content: 'prefers swedish', embedding: null }],
    );
    expect(unique).toHaveLength(0);
    expect(duplicates[0]!.reason).toBe('exact');
  });

  it('drops semantic near-duplicates by embedding cosine', () => {
    const v = [1, 0, 0];
    const near = [0.99, 0.01, 0];
    const { unique, duplicates } = dedupeCandidates(
      [{ content: 'B2B fintech company', embedding: near }],
      [{ content: 'enterprise fintech firm', embedding: v }],
      0.9,
    );
    expect(unique).toHaveLength(0);
    expect(duplicates[0]!.reason).toBe('semantic');
  });

  it('keeps genuinely new candidates and dedupes within the batch', () => {
    const { unique } = dedupeCandidates([
      { content: 'Fact one', embedding: [1, 0] },
      { content: 'fact one', embedding: [1, 0] }, // dup of the first
      { content: 'Fact two', embedding: [0, 1] },
    ]);
    expect(unique.map((u) => u.content)).toEqual(['Fact one', 'Fact two']);
  });

  it('normalizeContent lowercases, collapses whitespace, strips trailing punctuation', () => {
    expect(normalizeContent('  Hello   World!! ')).toBe('hello world');
  });
});

describe('extraction parsing', () => {
  it('parses a clean JSON object', () => {
    const mem = parseExtraction('{"memories":[{"content":"Likes tea","type":"semantic","importance":4}]}');
    expect(mem).toEqual([{ content: 'Likes tea', type: 'semantic', importance: 4 }]);
  });

  it('tolerates markdown fences and prose', () => {
    const raw = 'Sure!\n```json\n{"memories":[{"content":"Uses SEK","type":"episodic","importance":2}]}\n```';
    const mem = parseExtraction(raw);
    expect(mem).toHaveLength(1);
    expect(mem[0]).toMatchObject({ type: 'episodic', importance: 2 });
  });

  it('coerces bad importance and defaults the type', () => {
    const mem = parseExtraction('{"memories":[{"content":"x","importance":99},{"content":"y","type":"weird"}]}');
    expect(mem[0]!.importance).toBe(5);
    expect(mem[0]!.type).toBe('semantic');
    expect(mem[1]!.type).toBe('semantic');
  });

  it('returns [] for garbage or empty', () => {
    expect(parseExtraction('not json')).toEqual([]);
    expect(parseExtraction('{"memories":[]}')).toEqual([]);
    expect(parseExtraction('{"nope":1}')).toEqual([]);
    expect(parseJsonObject('nope')).toBeNull();
  });
});

describe('renderTranscript', () => {
  it('joins non-empty turns and truncates to the budget', () => {
    const t = renderTranscript(
      [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: '' },
        { role: 'assistant', content: 'hello' },
      ],
      1000,
    );
    expect(t).toBe('user: hi\nassistant: hello');
    expect(renderTranscript([{ role: 'user', content: 'x'.repeat(50) }], 10)).toHaveLength(10);
  });
});
