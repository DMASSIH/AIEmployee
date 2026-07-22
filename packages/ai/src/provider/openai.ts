import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import {
  AIProviderError,
  type AIProvider,
  type ChatRequest,
  type ChatResult,
  type ChatStreamEvent,
  type ModelInfo,
  type ToolCall,
} from './types.js';

/**
 * OpenAI chat-completions provider — the first concrete implementation.
 * Confined to this file: the runtime only ever sees the `AIProvider` interface,
 * so a future Anthropic/Gemini/Grok provider drops in with no runtime changes.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    readonly defaultModel = 'gpt-4o-mini',
    baseURL?: string,
  ) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  supportsModel(model: string): boolean {
    return /^(gpt-|o1|o3|chatgpt)/.test(model);
  }
  resolveModel(requested?: string): string {
    return requested && this.supportsModel(requested) ? requested : this.defaultModel;
  }
  modelInfo(model: string): ModelInfo {
    return { id: model, provider: 'openai' };
  }

  private toMessages(req: ChatRequest): ChatCompletionMessageParam[] {
    const out: ChatCompletionMessageParam[] = [];
    if (req.system) out.push({ role: 'system', content: req.system });
    for (const m of req.messages) {
      if (m.role === 'assistant') {
        out.push({
          role: 'assistant',
          content: m.content || null,
          ...(m.toolCalls && m.toolCalls.length > 0
            ? {
                tool_calls: m.toolCalls.map((tc) => ({
                  id: tc.id,
                  type: 'function' as const,
                  function: { name: tc.name, arguments: tc.arguments },
                })),
              }
            : {}),
        });
      } else if (m.role === 'tool') {
        out.push({ role: 'tool', tool_call_id: m.toolCallId ?? '', content: m.content });
      } else if (m.role === 'system') {
        out.push({ role: 'system', content: m.content });
      } else {
        out.push({ role: 'user', content: m.content });
      }
    }
    return out;
  }

  private toTools(req: ChatRequest): ChatCompletionTool[] | undefined {
    if (!req.tools || req.tools.length === 0) return undefined;
    return req.tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
  }

  async chat(req: ChatRequest): Promise<ChatResult> {
    try {
      const res = await this.client.chat.completions.create({
        model: req.model,
        messages: this.toMessages(req),
        tools: this.toTools(req),
        temperature: req.temperature,
        max_tokens: req.maxTokens,
        response_format: req.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      });
      const choice = res.choices[0];
      const toolCalls: ToolCall[] = (choice?.message.tool_calls ?? [])
        .filter((tc) => tc.type === 'function')
        .map((tc) => ({ id: tc.id, name: tc.function.name, arguments: tc.function.arguments }));
      return {
        content: choice?.message.content ?? '',
        toolCalls,
        usage: {
          promptTokens: res.usage?.prompt_tokens ?? 0,
          completionTokens: res.usage?.completion_tokens ?? 0,
          totalTokens: res.usage?.total_tokens ?? 0,
        },
        model: res.model,
        finishReason: choice?.finish_reason ?? 'stop',
      };
    } catch (err) {
      throw this.normalize(err);
    }
  }

  async *stream(req: ChatRequest): AsyncIterable<ChatStreamEvent> {
    let stream;
    try {
      stream = await this.client.chat.completions.create({
        model: req.model,
        messages: this.toMessages(req),
        tools: this.toTools(req),
        temperature: req.temperature,
        max_tokens: req.maxTokens,
        response_format: req.responseFormat === 'json' ? { type: 'json_object' } : undefined,
        stream: true,
        stream_options: { include_usage: true },
      });
    } catch (err) {
      throw this.normalize(err);
    }

    const partialTools = new Map<number, { id: string; name: string; arguments: string }>();
    let finishReason = 'stop';

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      const delta = choice?.delta;
      if (delta?.content) yield { type: 'text', delta: delta.content };
      for (const tc of delta?.tool_calls ?? []) {
        const acc = partialTools.get(tc.index) ?? { id: '', name: '', arguments: '' };
        if (tc.id) acc.id = tc.id;
        if (tc.function?.name) acc.name = tc.function.name;
        if (tc.function?.arguments) acc.arguments += tc.function.arguments;
        partialTools.set(tc.index, acc);
      }
      if (choice?.finish_reason) finishReason = choice.finish_reason;
      if (chunk.usage) {
        yield {
          type: 'usage',
          usage: {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens,
          },
        };
      }
    }

    for (const tc of partialTools.values()) {
      yield { type: 'tool_call', toolCall: tc };
    }
    yield { type: 'done', finishReason };
  }

  private normalize(err: unknown): AIProviderError {
    if (err instanceof OpenAI.APIError) {
      const status = typeof err.status === 'number' ? err.status : undefined;
      const retryable = status === 429 || (status ?? 0) >= 500;
      return new AIProviderError(err.message, status, retryable);
    }
    return new AIProviderError(err instanceof Error ? err.message : 'AI provider error');
  }
}
