import { retrieve, estimateTokens, type EmbeddingProvider } from '@aie/knowledge';
import { retrieveMemories, toScoredMemory } from '@aie/memory';
import type { Db } from '@aie/db';
import type { Citation, ScoredMemory } from '@aie/core';
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

/** Durable-memory retrieval settings for a turn (Milestone 11). */
export interface RuntimeMemoryOptions {
  /** Master switch — memory is only retrieved when true. */
  enabled: boolean;
  /** How many ranked memories to inject. */
  topK?: number;
  /** Token budget for the combined semantic + episodic memory block. */
  maxTokens?: number;
  /** Minimum combined ranking score to include a memory. */
  minScore?: number;
  /** Bump access_count/last_accessed_at for injected memories. Default true. */
  recordAccess?: boolean;
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
  memory?: RuntimeMemoryOptions;
  /** Token budget for the recent-conversation window (oldest turns trimmed). */
  historyTokenBudget?: number;
}

export type RuntimeEvent =
  | { type: 'memories'; memories: ScoredMemory[] }
  | { type: 'citations'; citations: Citation[] }
  | { type: 'token'; text: string }
  | { type: 'final'; content: string; usage: TokenUsage; model: string };

/** Default budget for the recent-conversation window kept in the prompt. */
const DEFAULT_HISTORY_TOKEN_BUDGET = 4_000;

export interface MemoryPromptBlock {
  semantic: string[];
  episodic: string[];
}

/**
 * Compose the system prompt in the Milestone 11 order:
 *
 *   1. System Prompt (employee persona)
 *   2. Semantic Memory (stable facts/preferences)
 *   3. Episodic Memory (relevant past interactions)
 *   4. RAG Knowledge (cited passages)
 *
 * The recent conversation and the current user message follow as chat messages,
 * completing the full pipeline order. Empty blocks are omitted.
 */
export function assembleSystemPrompt(
  base: string | null,
  employeeName: string,
  context: string,
  memory?: MemoryPromptBlock,
): string {
  const parts = [base?.trim() || `You are ${employeeName}, a helpful AI assistant.`];

  if (memory && memory.semantic.length > 0) {
    parts.push(
      `# Memory — what you know about this user and their organization\n` +
        `Treat these as established facts and preferences. Honor them unless the user says otherwise.\n\n` +
        memory.semantic.map((m) => `- ${m}`).join('\n'),
    );
  }
  if (memory && memory.episodic.length > 0) {
    parts.push(
      `# Memory — relevant past interactions\n` +
        `Context from earlier conversations. Use it for continuity; don't repeat it verbatim.\n\n` +
        memory.episodic.map((m) => `- ${m}`).join('\n'),
    );
  }
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
 * Keep the most RECENT turns that fit within a token budget (drop oldest first),
 * so long conversations never blow the context window. Always keeps at least the
 * latest turn. Pure — independently testable.
 */
export function trimHistory(
  history: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number,
): { role: 'user' | 'assistant'; content: string }[] {
  const kept: { role: 'user' | 'assistant'; content: string }[] = [];
  let total = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const t = estimateTokens(history[i]!.content);
    if (total + t > maxTokens && kept.length > 0) break;
    kept.unshift(history[i]!);
    total += t;
  }
  return kept;
}

/**
 * THE conversation runtime. Given an employee, short-term history, and a new
 * user message: retrieve durable memory (M11) and RAG knowledge (M9) in
 * parallel, assemble the prompt in the canonical order, trim the recent
 * conversation to a token budget, and stream the model's reply as normalized
 * events. Retrieval + generation only — persistence, SSE transport, rate
 * limiting, and job enqueue live in the API layer that drives this.
 *
 * Tool-calling is wired (tools are advertised when the registry is non-empty and
 * tool_call events are consumed), but no business tools are registered yet.
 */
export async function* runAssistant(params: RuntimeParams): AsyncGenerator<RuntimeEvent> {
  const { db, orgId, provider, embeddings, employee } = params;

  // 1. Retrieve durable memory (M11) and knowledge (M9) concurrently — both are
  //    independent, org-scoped by RLS, and read-only w.r.t. the turn.
  const ragPromise = retrieve(db, orgId, embeddings, {
    query: params.userMessage,
    topK: params.retrieval?.topK ?? 6,
    minScore: params.retrieval?.minScore ?? 0,
    maxTokens: params.retrieval?.maxTokens ?? 3_000,
    collectionId: undefined,
    documentId: undefined,
  });

  const memoryPromise = params.memory?.enabled
    ? retrieveMemories(db, orgId, embeddings, params.userMessage, {
        topK: params.memory.topK ?? 8,
        employeeId: employee.id,
        minScore: params.memory.minScore,
        maxTokens: params.memory.maxTokens ?? 1_500,
        recordAccess: params.memory.recordAccess,
      })
    : Promise.resolve(null);

  const [rag, memoryResult] = await Promise.all([ragPromise, memoryPromise]);

  // 2. Surface what was retrieved (UI: Memory Inspector, citations panel).
  const memoryBlock: MemoryPromptBlock = { semantic: [], episodic: [] };
  if (memoryResult && memoryResult.memories.length > 0) {
    const scored: ScoredMemory[] = memoryResult.memories.map(toScoredMemory);
    yield { type: 'memories', memories: scored };
    for (const m of memoryResult.memories) {
      (m.type === 'episodic' ? memoryBlock.episodic : memoryBlock.semantic).push(m.content);
    }
  }
  if (rag.citations.length > 0) yield { type: 'citations', citations: rag.citations };

  // 3. Assemble the prompt (System → Semantic → Episodic → RAG) and trim the
  //    recent conversation window (→ Current User Message stays last).
  const system = assembleSystemPrompt(employee.systemPrompt, employee.name, rag.context, memoryBlock);
  const history = trimHistory(
    params.history,
    params.historyTokenBudget ?? DEFAULT_HISTORY_TOKEN_BUDGET,
  );
  const messages: ProviderMessage[] = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user' as const, content: params.userMessage },
  ];
  const model = provider.resolveModel(employee.model);
  const tools = params.tools && !params.tools.isEmpty() ? params.tools.definitions() : undefined;

  // 4. Stream the reply.
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
