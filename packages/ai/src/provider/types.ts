/**
 * The ONLY AI-provider contract the runtime knows about. Nothing outside
 * `provider/` imports a concrete SDK — swap OpenAI ↔ Anthropic ↔ Gemini ↔ …
 * without touching runtime, API, or frontend logic.
 */

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema for the tool's arguments. */
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  /** Raw JSON string of arguments (parsed by the executor). */
  arguments: string;
}

export interface ProviderMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  /** Assistant turn requesting tools. */
  toolCalls?: ToolCall[];
  /** For role:'tool' — which call this result answers. */
  toolCallId?: string;
}

export interface ChatRequest {
  model: string;
  system?: string;
  messages: ProviderMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  /** Structured output: 'json' asks the model for a single JSON object. */
  responseFormat?: 'text' | 'json';
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatResult {
  content: string;
  toolCalls: ToolCall[];
  usage: TokenUsage;
  model: string;
  finishReason: string;
}

export type ChatStreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_call'; toolCall: ToolCall }
  | { type: 'usage'; usage: TokenUsage }
  | { type: 'done'; finishReason: string };

export interface ModelInfo {
  id: string;
  provider: string;
  contextWindow?: number;
}

/** Normalized provider error so the runtime handles all providers uniformly. */
export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export interface AIProvider {
  readonly name: string;
  readonly defaultModel: string;
  /** Does this provider serve the given model id? */
  supportsModel(model: string): boolean;
  /** The requested model if supported, else the provider default. */
  resolveModel(requested?: string): string;
  modelInfo(model: string): ModelInfo;
  chat(req: ChatRequest): Promise<ChatResult>;
  stream(req: ChatRequest): AsyncIterable<ChatStreamEvent>;
}
