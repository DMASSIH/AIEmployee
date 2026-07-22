import { describe, it, expect } from 'vitest';
import { EchoProvider } from '../src/provider/echo.js';
import { ToolRegistry } from '../src/tools.js';
import { estimateCostUsd } from '../src/pricing.js';
import { assembleSystemPrompt } from '../src/runtime.js';
import type { ChatRequest } from '../src/provider/types.js';

const req = (userText: string, system?: string): ChatRequest => ({
  model: 'echo-1',
  system,
  messages: [{ role: 'user', content: userText }],
});

describe('EchoProvider', () => {
  const p = new EchoProvider();

  it('supports any model label and resolves the requested one', () => {
    expect(p.supportsModel('claude-sonnet-5')).toBe(true);
    expect(p.resolveModel('claude-sonnet-5')).toBe('claude-sonnet-5');
    expect(p.resolveModel()).toBe('echo-1');
  });

  it('chat returns content + non-zero usage', async () => {
    const res = await p.chat(req('How do refunds work?'));
    expect(res.content.length).toBeGreaterThan(0);
    expect(res.usage.totalTokens).toBe(res.usage.promptTokens + res.usage.completionTokens);
    expect(res.usage.completionTokens).toBeGreaterThan(0);
    expect(res.finishReason).toBe('stop');
  });

  it('streams text deltas then a usage + done event', async () => {
    let text = '';
    let sawUsage = false;
    let sawDone = false;
    for await (const ev of p.stream(req('hello'))) {
      if (ev.type === 'text') text += ev.delta;
      if (ev.type === 'usage') sawUsage = true;
      if (ev.type === 'done') sawDone = true;
    }
    expect(text.length).toBeGreaterThan(0);
    expect(sawUsage).toBe(true);
    expect(sawDone).toBe(true);
  });
});

describe('pricing', () => {
  it('estimates cost from tokens and model', () => {
    // gpt-4o-mini: $0.15/1M in, $0.60/1M out
    expect(estimateCostUsd('gpt-4o-mini', 1_000_000, 1_000_000)).toBeCloseTo(0.75, 6);
    expect(estimateCostUsd('echo-1', 1000, 1000)).toBe(0);
    // unknown model → prefix/fallback, never throws
    expect(estimateCostUsd('some-unknown-model', 1000, 1000)).toBeGreaterThanOrEqual(0);
  });
});

describe('ToolRegistry', () => {
  it('is empty by default (framework only) and executes a registered tool', async () => {
    const reg = new ToolRegistry();
    expect(reg.isEmpty()).toBe(true);
    expect(reg.definitions()).toEqual([]);
    reg.register({
      definition: { name: 'echo', description: 'echoes', parameters: { type: 'object', properties: {} } },
      handler: (args) => Promise.resolve(args),
    });
    expect(reg.isEmpty()).toBe(false);
    const out = await reg.execute('echo', '{"a":1}', { orgId: 'o', userId: 'u' });
    expect(out).toEqual({ a: 1 });
    await expect(reg.execute('missing', '{}', { orgId: 'o', userId: 'u' })).rejects.toThrow();
  });
});

describe('assembleSystemPrompt', () => {
  it('uses the persona and appends cited context', () => {
    const s = assembleSystemPrompt('You are Maya.', 'Maya', '[1] (doc)\nRefunds take 7 days.');
    expect(s).toContain('You are Maya.');
    expect(s).toContain('# Knowledge');
    expect(s).toContain('cite sources inline as [n]');
    expect(s).toContain('Refunds take 7 days.');
  });

  it('falls back to a default persona and omits Knowledge when no context', () => {
    const s = assembleSystemPrompt(null, 'Nova', '');
    expect(s).toContain('You are Nova');
    expect(s).not.toContain('# Knowledge');
  });
});
