/**
 * The narrow AI-provider contract the memory engine depends on — deliberately a
 * STRUCTURAL SUBSET of @aie/ai's `AIProvider`. Extraction and summarization need
 * only `chat` + `resolveModel`, so we define the interface here and take it by
 * dependency injection. This is what keeps the dependency graph acyclic: the AI
 * runtime imports @aie/memory (Milestone 11, Phase 3), so @aie/memory must never
 * import @aie/ai. The real provider is assignable to this by structural typing.
 */
export interface MemoryChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface MemoryChatRequest {
  model: string;
  system?: string;
  messages: MemoryChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** 'json' asks the model for a single JSON object (structured extraction). */
  responseFormat?: 'text' | 'json';
}

export interface MemoryChatResult {
  content: string;
}

export interface MemoryChatProvider {
  /** The requested model if supported, else the provider default. */
  resolveModel(requested?: string): string;
  chat(req: MemoryChatRequest): Promise<MemoryChatResult>;
}
