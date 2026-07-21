import { retrieve, estimateTokens, type EmbeddingProvider } from '@aie/knowledge';
import type { Db } from '@aie/db';
import type { Citation } from '@aie/core';
import type { AIProvider, ProviderMessage, TokenUsage } from './provider/types.js';
import type { ToolRegistry } from './tools.js';

export interface RuntimeEmployee {
  id: string;
  name: string;
  systemPrompt: string | null;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface RuntimeParams {
  db: Db;
  orgId: string;
  provider: AIProvider;
  embeddings: EmbeddingProvider;
  tools?: ToolRegistry;
  employee: RuntimeEmployee;
  /** Prior turns (short-term memory), oldest first. */
  history: { role: 'user' | 'assistant'; content: string }[];
  userMessage: string;
  retrieval?: { topK?: number; minScore?: number; maxTokens?: number };
}

export type RuntimeEvent =
  | { type: 'citations'; citations: Citation[] }
  | { type: 'token'; text: string }
  | { type: 'final'; content: string; usage: TokenUsage; model: string };

/** Compose the system prompt: employee persona + (optional) cited RAG context. */
export function assembleSystemPrompt(
  base: string | null,
  employeeName: string,
  context: string,
): string {
  const parts = [base?.trim() || `You are ${employeeName}, a helpful AI assistant.`];
  if (context.trim()) {
    parts.push(
      `# Knowledge\n` +
        `Answer using the context below when relevant, and cite sources inline as [n] ` +
        `matching the numbered passages. If the context does not cover the question, say so plainly.\n\n` +
        context,
    );
  }
  return parts.join('\n\n');
}

/**
 * THE conversation runtime. Given an employee, short-term history, and a new
 * user message: retrieve M9 RAG context, assemble the prompt, and stream the
 * model's reply as normalized events. Retrieval + generation only — persistence,
 * SSE transport, and rate limiting live in the API layer that drives this.
 *
 * Tool-calling is wired (tools are advertised when the registry is non-empty and
 * tool_call events are consumed), but no business tools are registered in M10.
 */
export async function* runAssistant(params: RuntimeParams): AsyncGenerator<RuntimeEvent> {
  const { db, orgId, provider, embeddings, employee } = params;

  // 1. Retrieve org-scoped knowledge (reuses M9 — never rebuilt).
  const rag = await retrieve(db, orgId, embeddings, {
    query: params.userMessage,
    topK: params.retrieval?.topK ?? 6,
    minScore: params.retrieval?.minScore ?? 0,
    maxTokens: params.retrieval?.maxTokens ?? 3_000,
    collectionId: undefined,
    documentId: undefined,
  });
  if (rag.citations.length > 0) yield { type: 'citations', citations: rag.citations };

  // 2. Assemble prompt + short-term history.
  const system = assembleSystemPrompt(employee.systemPrompt, employee.name, rag.context);
  const messages: ProviderMessage[] = [
    ...params.history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user' as const, content: params.userMessage },
  ];
  const model = provider.resolveModel(employee.model);
  const tools = params.tools && !params.tools.isEmpty() ? params.tools.definitions() : undefined;

  // 3. Stream the reply.
  let content = '';
  let usage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  for await (const ev of provider.stream({
    model,
    system,
    messages,
    tools,
    temperature: employee.temperature,
    maxTokens: employee.maxTokens,
  })) {
    if (ev.type === 'text') {
      content += ev.delta;
      yield { type: 'token', text: ev.delta };
    } else if (ev.type === 'usage') {
      usage = ev.usage;
    }
    // 'tool_call'/'done' are consumed here; tool execution arrives with tools.
  }

  // Fallback token estimate if the provider didn't report usage.
  if (usage.totalTokens === 0) {
    const promptTokens =
      estimateTokens(system) + messages.reduce((n, m) => n + estimateTokens(m.content), 0);
    const completionTokens = estimateTokens(content);
    usage = { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens };
  }

  yield { type: 'final', content, usage, model };
}
