/**
 * Model pricing for cost estimation (USD per 1M tokens). Approximate list
 * prices — used to persist an *estimated* cost per response, not for billing.
 * Unknown models fall back to a prefix match, then to zero.
 */
const PRICES: Record<string, { in: number; out: number }> = {
  // OpenAI
  'gpt-4o': { in: 2.5, out: 10 },
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'gpt-4.1': { in: 2, out: 8 },
  'gpt-4.1-mini': { in: 0.4, out: 1.6 },
  'o1': { in: 15, out: 60 },
  'o3-mini': { in: 1.1, out: 4.4 },
  // Anthropic
  'claude-opus-4-8': { in: 15, out: 75 },
  'claude-sonnet-5': { in: 3, out: 15 },
  'claude-haiku-4-5': { in: 0.8, out: 4 },
  'claude-fable-5': { in: 1, out: 5 },
  // Offline dev provider
  'echo-1': { in: 0, out: 0 },
};

function priceFor(model: string): { in: number; out: number } {
  if (PRICES[model]) return PRICES[model];
  const prefixMatch = Object.keys(PRICES).find((k) => model.startsWith(k) || k.startsWith(model));
  return prefixMatch ? PRICES[prefixMatch]! : { in: 0, out: 0 };
}

export function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const p = priceFor(model);
  const cost = (promptTokens / 1_000_000) * p.in + (completionTokens / 1_000_000) * p.out;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
