import type { EmbeddingProvider } from './provider.js';

/**
 * OpenAI text-embedding-3-small (1536 dims), via plain fetch — no SDK
 * dependency. Activated only when EMBEDDING_PROVIDER=openai and a key is set;
 * the rest of the app never references this class directly.
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly model = 'text-embedding-3-small';
  readonly dimensions = 1536;

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = 'https://api.openai.com/v1',
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: this.model, input: texts, dimensions: this.dimensions }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`OpenAI embeddings failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    const body = (await res.json()) as { data: { index: number; embedding: number[] }[] };
    // Preserve input order — the API returns an `index` per item.
    return body.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }
}
