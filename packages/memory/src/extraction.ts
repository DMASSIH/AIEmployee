import type { MemoryType } from '@aie/core';
import type { MemoryChatProvider } from './provider.js';

/** A memory the extractor proposes from a conversation, before dedup/persist. */
export interface ExtractedMemory {
  content: string;
  type: MemoryType;
  importance: number;
}

const EXTRACTION_SYSTEM = `You extract durable, reusable memories from a conversation between a user and an AI assistant.

Return ONLY facts worth remembering for FUTURE conversations:
- semantic: stable facts, preferences, constraints about the user or their business (e.g. "Prefers replies in Swedish", "Company is B2B SaaS in fintech").
- episodic: notable decisions, commitments, or events from this conversation worth recalling later (e.g. "Agreed to a 20% discount for annual billing").

Rules:
- Do NOT extract transient small-talk, greetings, or anything already obvious.
- Each memory must stand alone without the conversation for context.
- Keep each under 200 characters, in third person, factual.
- importance is 1 (trivial) to 5 (critical). Preferences/constraints are usually 3-4; one-off trivia is 1-2.
- If nothing is worth remembering, return an empty array.

Respond with a single JSON object: {"memories":[{"content":string,"type":"semantic"|"episodic","importance":1-5}]}`;

/**
 * Best-effort JSON extraction from a model reply — tolerates markdown fences and
 * leading prose by grabbing the outermost {...}. Returns null if unparseable.
 */
export function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** Validate/normalize one raw item into an ExtractedMemory, or drop it. */
function coerceMemory(item: unknown): ExtractedMemory | null {
  if (!item || typeof item !== 'object') return null;
  const rec = item as Record<string, unknown>;
  const content = typeof rec.content === 'string' ? rec.content.trim() : '';
  if (!content) return null;
  const type: MemoryType = rec.type === 'episodic' ? 'episodic' : 'semantic';
  const rawImp = Number(rec.importance);
  const importance = Number.isFinite(rawImp) ? Math.max(1, Math.min(5, Math.round(rawImp))) : 3;
  return { content: content.slice(0, 2_000), type, importance };
}

/** Parse a model reply into validated ExtractedMemory[]. Pure — testable. */
export function parseExtraction(raw: string): ExtractedMemory[] {
  const obj = parseJsonObject(raw);
  if (!obj || typeof obj !== 'object') return [];
  const list = (obj as Record<string, unknown>).memories;
  if (!Array.isArray(list)) return [];
  return list.map(coerceMemory).filter((m): m is ExtractedMemory => m !== null);
}

/**
 * Ask the injected provider to extract memories from a transcript. Provider-
 * agnostic (dependency injection); no @aie/ai import. The caller dedupes and
 * persists the result — this only proposes.
 */
export async function extractMemories(
  provider: MemoryChatProvider,
  transcript: string,
  opts: { maxChars?: number } = {},
): Promise<ExtractedMemory[]> {
  const text = transcript.trim();
  if (!text) return [];
  const { content } = await provider.chat({
    model: provider.resolveModel(),
    system: EXTRACTION_SYSTEM,
    messages: [{ role: 'user', content: text.slice(0, opts.maxChars ?? 12_000) }],
    temperature: 0,
    responseFormat: 'json',
  });
  return parseExtraction(content);
}
