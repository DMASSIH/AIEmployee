import type { MemoryChatProvider } from './provider.js';

/** A single transcript turn for summarization/extraction input. */
export interface TranscriptTurn {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

/** Render turns into a plain transcript, truncated to a char budget. */
export function renderTranscript(turns: TranscriptTurn[], maxChars = 12_000): string {
  return turns
    .filter((t) => t.content.trim())
    .map((t) => `${t.role}: ${t.content}`)
    .join('\n')
    .slice(0, maxChars);
}

const SUMMARY_SYSTEM =
  'Summarize the following conversation in 2-4 sentences. Be factual and concise. ' +
  'Capture the topic, any decisions, and open questions. Do not add information not present.';

/**
 * Produce a rolling conversation summary via the injected provider. Reuses the
 * same 1-2 sentence discipline as M10's inline summarizer but is provider-
 * agnostic and callable from the background worker. Returns '' for empty input.
 */
export async function summarizeConversation(
  provider: MemoryChatProvider,
  transcript: string,
  opts: { maxChars?: number } = {},
): Promise<string> {
  const text = transcript.trim();
  if (!text) return '';
  const { content } = await provider.chat({
    model: provider.resolveModel(),
    system: SUMMARY_SYSTEM,
    messages: [{ role: 'user', content: text.slice(0, opts.maxChars ?? 12_000) }],
    temperature: 0.2,
  });
  return content.trim();
}
