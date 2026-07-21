import { estimateTokens } from './tokens.js';
import type { ExtractResult } from './extract/types.js';

export interface Chunk {
  content: string;
  tokenCount: number;
  metadata: Record<string, unknown>;
}

export interface ChunkOptions {
  /** Target maximum tokens per chunk. */
  maxTokens?: number;
  /** Tokens of trailing context carried into the next chunk (continuity). */
  overlapTokens?: number;
}

const DEFAULTS = { maxTokens: 350, overlapTokens: 50 };
const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*$/;

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
}

function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** Trailing sentences of `text` totalling up to `budget` tokens (for overlap). */
function tailByTokens(text: string, budget: number): string {
  if (budget <= 0) return '';
  const sentences = splitSentences(text);
  const kept: string[] = [];
  let tokens = 0;
  for (let i = sentences.length - 1; i >= 0; i--) {
    const t = estimateTokens(sentences[i]!);
    if (tokens + t > budget && kept.length > 0) break;
    kept.unshift(sentences[i]!);
    tokens += t;
  }
  return kept.join(' ');
}

/**
 * Heading-aware, token-bounded chunker. Walks paragraphs, tracks the markdown
 * heading breadcrumb, and greedily fills chunks up to `maxTokens`, carrying an
 * `overlapTokens` tail forward so context isn't severed at a boundary. A single
 * oversized paragraph is split by sentence. Each chunk is prefixed with its
 * heading breadcrumb (matches the knowledge_chunks.content contract).
 */
export function chunkText(text: string, options: ChunkOptions = {}): Chunk[] {
  const maxTokens = options.maxTokens ?? DEFAULTS.maxTokens;
  const overlapTokens = options.overlapTokens ?? DEFAULTS.overlapTokens;

  const headingStack: string[] = [];
  const chunks: Chunk[] = [];

  let buffer: string[] = [];
  let bufferTokens = 0;
  let breadcrumb = '';

  const flush = () => {
    if (buffer.length === 0) return;
    const body = buffer.join('\n\n');
    const content = breadcrumb ? `${breadcrumb}\n\n${body}` : body;
    chunks.push({
      content,
      tokenCount: estimateTokens(content),
      metadata: breadcrumb ? { heading: breadcrumb } : {},
    });
    const overlap = tailByTokens(body, overlapTokens);
    buffer = overlap ? [overlap] : [];
    bufferTokens = overlap ? estimateTokens(overlap) : 0;
  };

  const addUnit = (unit: string) => {
    const t = estimateTokens(unit);
    if (bufferTokens + t > maxTokens && buffer.length > 0) flush();
    buffer.push(unit);
    bufferTokens += t;
  };

  for (const para of splitParagraphs(text)) {
    const heading = HEADING_RE.exec(para);
    if (heading) {
      // Boundary: a new heading starts a new logical section.
      flush();
      const level = heading[1]!.length;
      const title = heading[2]!.trim();
      headingStack.length = level - 1;
      headingStack[level - 1] = title;
      breadcrumb = headingStack.filter(Boolean).join(' › ');
      continue;
    }
    if (estimateTokens(para) > maxTokens) {
      for (const sentence of splitSentences(para)) addUnit(sentence);
    } else {
      addUnit(para);
    }
  }
  flush();

  return chunks;
}

/**
 * Chunk an extraction result. When per-page text is available (PDFs), pages are
 * chunked independently so a chunk never straddles a page and can carry a
 * `page` number in its metadata.
 */
export function chunkExtract(result: ExtractResult, options: ChunkOptions = {}): Chunk[] {
  if (result.pages && result.pages.length > 0) {
    const out: Chunk[] = [];
    result.pages.forEach((pageText, i) => {
      for (const chunk of chunkText(pageText, options)) {
        out.push({ ...chunk, metadata: { ...chunk.metadata, page: i + 1 } });
      }
    });
    return out;
  }
  return chunkText(result.text, options);
}
