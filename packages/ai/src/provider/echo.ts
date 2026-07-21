import { estimateTokens } from '@aie/knowledge';
import type { AIProvider, ChatRequest, ChatResult, ChatStreamEvent, ModelInfo } from './types.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function promptTokensOf(req: ChatRequest): number {
  let t = req.system ? estimateTokens(req.system) : 0;
  for (const m of req.messages) t += estimateTokens(m.content);
  return t;
}

function buildReply(req: ChatRequest): string {
  const lastUser = [...req.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const hasContext = (req.system ?? '').includes('[1]');
  return (
    `Thanks for your message. ` +
    (hasContext
      ? `Based on the knowledge I was given, here's a concise answer to “${lastUser.slice(0, 160)}”. `
      : `Regarding “${lastUser.slice(0, 160)}” — I don't have specific knowledge attached yet, but here's my best help. `) +
    `\n\n(This is the offline echo runtime — set AI_PROVIDER=openai with an API key for live model responses.)`
  );
}

/**
 * Deterministic, offline chat provider. Streams a context-aware canned reply so
 * the entire runtime — streaming, token accounting, citations, persistence — is
 * exercisable without any API key. NOT for production answers.
 */
export class EchoProvider implements AIProvider {
  readonly name = 'echo';
  readonly defaultModel = 'echo-1';

  supportsModel(): boolean {
    return true; // echoes under whatever model label the employee is configured with
  }
  resolveModel(requested?: string): string {
    return requested ?? this.defaultModel;
  }
  modelInfo(model: string): ModelInfo {
    return { id: model, provider: 'echo', contextWindow: 8192 };
  }

  chat(req: ChatRequest): Promise<ChatResult> {
    const content = buildReply(req);
    const promptTokens = promptTokensOf(req);
    const completionTokens = estimateTokens(content);
    return Promise.resolve({
      content,
      toolCalls: [],
      usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
      model: this.resolveModel(req.model),
      finishReason: 'stop',
    });
  }

  async *stream(req: ChatRequest): AsyncIterable<ChatStreamEvent> {
    const content = buildReply(req);
    const tokens = content.match(/\S+\s*/g) ?? [content];
    for (const chunk of tokens) {
      yield { type: 'text', delta: chunk };
      await sleep(12); // visible incremental streaming in the UI
    }
    const promptTokens = promptTokensOf(req);
    const completionTokens = estimateTokens(content);
    yield { type: 'usage', usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens } };
    yield { type: 'done', finishReason: 'stop' };
  }
}
