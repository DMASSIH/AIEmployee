import { withOrg, sql, type Db } from '@aie/db';
import type {
  RetrieveQuery,
  RetrievalResult,
  RetrievedChunk,
  Citation,
} from '@aie/core';
import type { EmbeddingProvider } from './embeddings/index.js';
import { estimateTokens } from './tokens.js';

/** A chunk with its similarity score, before citation assignment. */
export interface ScoredChunk {
  id: string;
  sourceId: string;
  sourceName: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  score: number;
  metadata: Record<string, unknown>;
}

export interface VectorSearchOptions {
  topK: number;
  collectionId?: string;
  documentId?: string;
  minScore?: number;
}

function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

/**
 * pgvector cosine similarity search, scoped to the org by RLS (runs inside
 * withOrg). Returns the top-K most similar READY-document chunks, most similar
 * first. `<=>` is cosine distance; similarity = 1 − distance.
 */
export async function vectorSearch(
  db: Db,
  orgId: string,
  queryVector: number[],
  opts: VectorSearchOptions,
): Promise<ScoredChunk[]> {
  const vec = toVectorLiteral(queryVector);
  const rows = await withOrg(db, orgId, async (tx) => {
    const filters = [sql`c.embedding is not null`, sql`s.deleted_at is null`];
    if (opts.collectionId) filters.push(sql`s.collection_id = ${opts.collectionId}`);
    if (opts.documentId) filters.push(sql`c.source_id = ${opts.documentId}`);
    let where = filters[0]!;
    for (let i = 1; i < filters.length; i++) where = sql`${where} and ${filters[i]}`;

    return tx.execute(sql`
      select
        c.id,
        c.source_id      as "sourceId",
        s.name           as "sourceName",
        c.chunk_index    as "chunkIndex",
        c.content,
        c.token_count    as "tokenCount",
        c.metadata,
        1 - (c.embedding <=> ${vec}::vector) as score
      from knowledge_chunks c
      join knowledge_sources s on s.id = c.source_id
      where ${where}
      order by c.embedding <=> ${vec}::vector asc
      limit ${opts.topK}
    `);
  });

  const min = opts.minScore ?? 0;
  return (rows as unknown as Record<string, unknown>[])
    .map((r) => ({
      id: String(r.id),
      sourceId: String(r.sourceId),
      sourceName: String(r.sourceName),
      chunkIndex: Number(r.chunkIndex),
      content: String(r.content),
      tokenCount: Number(r.tokenCount) || estimateTokens(String(r.content)),
      score: Number(r.score),
      metadata: (r.metadata as Record<string, unknown>) ?? {},
    }))
    .filter((c) => c.score >= min);
}

/**
 * Assemble ranked chunks into a citation-annotated context string within a
 * token budget. Pure and independently testable. Each included chunk gets a
 * sequential citation number `[n]`; the returned `citations` map lets callers
 * resolve those numbers back to sources. No LLM involved.
 */
export function buildContext(
  chunks: ScoredChunk[],
  maxTokens: number,
): Pick<RetrievalResult, 'context' | 'citations' | 'tokenCount'> & { chunks: RetrievedChunk[] } {
  const included: RetrievedChunk[] = [];
  const citations: Citation[] = [];
  const parts: string[] = [];
  let tokenCount = 0;

  for (const chunk of chunks) {
    if (tokenCount + chunk.tokenCount > maxTokens && included.length > 0) break;
    const citation = included.length + 1;
    tokenCount += chunk.tokenCount;
    included.push({
      id: chunk.id,
      sourceId: chunk.sourceId,
      sourceName: chunk.sourceName,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      score: chunk.score,
      tokenCount: chunk.tokenCount,
      citation,
      metadata: chunk.metadata,
    });
    citations.push({
      index: citation,
      sourceId: chunk.sourceId,
      sourceName: chunk.sourceName,
      chunkId: chunk.id,
    });
    parts.push(`[${citation}] (${chunk.sourceName})\n${chunk.content}`);
  }

  return { context: parts.join('\n\n'), citations, tokenCount, chunks: included };
}

/**
 * THE RAG entry point future Conversation/Runtime modules call: embed the query,
 * retrieve top-K org-scoped chunks, and build a budgeted, citation-annotated
 * context. Retrieval only — no generation.
 */
export async function retrieve(
  db: Db,
  orgId: string,
  provider: EmbeddingProvider,
  query: RetrieveQuery,
): Promise<RetrievalResult> {
  const [queryVector] = await provider.embed([query.query]);
  const scored = await vectorSearch(db, orgId, queryVector!, {
    topK: query.topK,
    collectionId: query.collectionId,
    documentId: query.documentId,
    minScore: query.minScore,
  });
  const { context, citations, tokenCount, chunks } = buildContext(scored, query.maxTokens);
  return { query: query.query, chunks, context, citations, tokenCount };
}
