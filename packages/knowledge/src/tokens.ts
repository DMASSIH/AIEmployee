/**
 * Cheap, model-agnostic token estimate. Not a real BPE tokenizer — good enough
 * for chunk sizing and context budgeting, and it never pulls in a heavy tokenizer
 * dependency. ~4 characters per token is the usual English heuristic.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
