import { randomUUID } from 'node:crypto';
import { withOrg, type Db } from '@aie/db';
import {
  estimateCostUsd,
  runAssistant,
  type AIProvider,
  type ToolRegistry,
} from '@aie/ai';
import type { EmbeddingProvider } from '@aie/knowledge';
import type {
  Citation,
  ConversationView,
  CreateConversationInput,
  UpdateConversationInput,
  ListConversationsQuery,
  MessageView,
  PaginatedConversations,
  StreamEvent,
  UsageInfo,
} from '@aie/core';
import { writeAudit } from '../../lib/audit.js';
import { getEmployeeService } from '../employees/service.js';
import * as repo from './repository.js';
import type { ConversationRow, MessageRow, ConversationListRow } from './repository.js';

export interface ConversationContext {
  orgId: string;
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface RuntimeDeps {
  provider: AIProvider;
  embeddings: EmbeddingProvider;
  tools: ToolRegistry;
}

/** How many prior messages feed short-term memory. */
const HISTORY_WINDOW = 20;

/* --------------------------------- mapping -------------------------------- */

interface TextBlock {
  type: 'text';
  text: string;
}
interface CitationsBlock {
  type: 'citations';
  citations: Citation[];
}

function textBlock(text: string): TextBlock {
  return { type: 'text', text };
}
function extractText(content: unknown[]): string {
  return content
    .filter((b): b is TextBlock => (b as TextBlock)?.type === 'text')
    .map((b) => b.text)
    .join('');
}
function extractCitations(content: unknown[]): Citation[] {
  const block = content.find((b): b is CitationsBlock => (b as CitationsBlock)?.type === 'citations');
  return block?.citations ?? [];
}

function toConversationView(row: ConversationListRow | (ConversationRow & { employeeName?: string | null; messageCount?: number })): ConversationView {
  return {
    id: row.id,
    organizationId: row.orgId,
    employeeId: row.employeeId,
    employeeName: (row as ConversationListRow).employeeName ?? null,
    title: row.title ?? null,
    summary: row.summary ?? null,
    status: row.status,
    channel: row.channel,
    messageCount: (row as ConversationListRow).messageCount ?? 0,
    lastMessageAt: row.lastMessageAt ? row.lastMessageAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMessageView(row: MessageRow): MessageView {
  const content = extractText(row.content);
  const inTok = row.inputTokens ?? null;
  const outTok = row.outputTokens ?? null;
  const total = inTok !== null && outTok !== null ? inTok + outTok : null;
  const cost = row.model && inTok !== null && outTok !== null ? estimateCostUsd(row.model, inTok, outTok) : null;
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role,
    content,
    citations: extractCitations(row.content),
    model: row.model ?? null,
    promptTokens: inTok,
    completionTokens: outTok,
    totalTokens: total,
    costUsd: cost,
    latencyMs: row.latencyMs ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function deriveTitle(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean;
}

/* --------------------------------- reads ---------------------------------- */

export async function listConversationsService(
  db: Db,
  orgId: string,
  query: ListConversationsQuery,
): Promise<PaginatedConversations> {
  return withOrg(db, orgId, async (tx) => {
    const { rows, total } = await repo.listConversations(tx, orgId, query);
    return { items: rows.map(toConversationView), total, page: query.page, pageSize: query.pageSize };
  });
}

export async function getConversationService(
  db: Db,
  orgId: string,
  id: string,
): Promise<ConversationView | null> {
  return withOrg(db, orgId, async (tx) => {
    const row = await repo.findConversationById(tx, id);
    if (!row) return null;
    const messageCount = await repo.conversationMessageCount(tx, id);
    return toConversationView({ ...row, messageCount });
  });
}

export async function listMessagesService(
  db: Db,
  orgId: string,
  conversationId: string,
): Promise<MessageView[] | null> {
  return withOrg(db, orgId, async (tx) => {
    const conv = await repo.findConversationById(tx, conversationId);
    if (!conv) return null;
    const rows = await repo.listMessages(tx, conversationId);
    return rows.map(toMessageView);
  });
}

/* --------------------------------- writes --------------------------------- */

export type CreateConversationResult =
  | { ok: true; conversation: ConversationView }
  | { ok: false; reason: 'employee_not_found' };

export async function createConversationService(
  db: Db,
  ctx: ConversationContext,
  input: CreateConversationInput,
): Promise<CreateConversationResult> {
  // Employee must exist in this org (RLS-checked inside the employees service).
  const employee = await getEmployeeService(db, ctx.orgId, input.employeeId);
  if (!employee) return { ok: false, reason: 'employee_not_found' };

  // Leave null when nothing to title from — the first streamed message will
  // auto-derive the title (the stream only titles when this is still unset).
  const title = input.title ?? (input.message ? deriveTitle(input.message) : null);
  return withOrg(db, ctx.orgId, async (tx) => {
    const row = await repo.insertConversation(tx, {
      orgId: ctx.orgId,
      employeeId: input.employeeId,
      channel: 'web',
      status: 'open',
      title,
      createdBy: ctx.userId,
    });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: 'conversation.created',
      targetType: 'conversation',
      targetId: row.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { employeeId: input.employeeId },
    });
    return { ok: true, conversation: toConversationView({ ...row, employeeName: employee.name, messageCount: 0 }) };
  });
}

export async function updateConversationService(
  db: Db,
  ctx: ConversationContext,
  id: string,
  input: UpdateConversationInput,
): Promise<ConversationView | null> {
  return withOrg(db, ctx.orgId, async (tx) => {
    const existing = await repo.findConversationById(tx, id);
    if (!existing) return null;
    const row = await repo.updateConversation(tx, id, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    });
    if (!row) return null;
    const messageCount = await repo.conversationMessageCount(tx, id);
    return toConversationView({ ...row, messageCount });
  });
}

export async function deleteConversationService(
  db: Db,
  ctx: ConversationContext,
  id: string,
): Promise<boolean> {
  return withOrg(db, ctx.orgId, async (tx) => {
    const existing = await repo.findConversationById(tx, id);
    if (!existing) return false;
    await repo.updateConversation(tx, id, { deletedAt: new Date() });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: 'conversation.deleted',
      targetType: 'conversation',
      targetId: id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return true;
  });
}

/* ------------------------------- streaming -------------------------------- */

export type StreamStart =
  | { ok: true; stream: AsyncGenerator<StreamEvent> }
  | { ok: false; reason: 'not_found' };

/**
 * The chat turn: persist the user message, stream the assistant reply (RAG +
 * model), then persist the assistant message + token usage and update the
 * conversation. Yields SSE StreamEvents. Two short transactions bracket the
 * (long) streaming call so no DB transaction is held open during generation.
 */
export async function streamMessageService(
  db: Db,
  ctx: ConversationContext,
  deps: RuntimeDeps,
  conversationId: string,
  content: string,
): Promise<StreamStart> {
  // 1. Load conversation + history (read-only) — no writes yet.
  const loaded = await withOrg(db, ctx.orgId, async (tx) => {
    const conv = await repo.findConversationById(tx, conversationId);
    if (!conv) return null;
    const history = (await repo.recentMessages(tx, conversationId, HISTORY_WINDOW))
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: extractText(m.content) }))
      .filter((m) => m.content.length > 0);
    return { conv, history };
  });
  if (!loaded) return { ok: false, reason: 'not_found' };

  // 2. Verify the employee still exists BEFORE persisting anything — otherwise a
  //    conversation with a since-deleted employee would orphan a user message.
  const employee = await getEmployeeService(db, ctx.orgId, loaded.conv.employeeId);
  if (!employee) return { ok: false, reason: 'not_found' };

  // 3. Now the turn is known to proceed — persist the user message.
  const userMessageId = randomUUID();
  await withOrg(db, ctx.orgId, (tx) =>
    repo.insertMessage(tx, {
      id: userMessageId,
      orgId: ctx.orgId,
      conversationId,
      role: 'user',
      content: [textBlock(content)],
    }),
  );

  const assistantMessageId = randomUUID();
  const prep = { conv: loaded.conv, history: loaded.history, userMessageId };
  const self = { db, ctx, deps, conversationId, content, prep, employee, assistantMessageId };
  return { ok: true, stream: generate(self) };
}

async function* generate(s: {
  db: Db;
  ctx: ConversationContext;
  deps: RuntimeDeps;
  conversationId: string;
  content: string;
  prep: { conv: ConversationRow; history: { role: 'user' | 'assistant'; content: string }[]; userMessageId: string };
  employee: NonNullable<Awaited<ReturnType<typeof getEmployeeService>>>;
  assistantMessageId: string;
}): AsyncGenerator<StreamEvent> {
  const { db, ctx, deps, conversationId, content, prep, employee, assistantMessageId } = s;
  yield {
    type: 'start',
    conversationId,
    userMessageId: prep.userMessageId,
    assistantMessageId,
  };

  const started = Date.now();
  let text = '';
  let citations: Citation[] = [];
  let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let model: string = employee.model;

  try {
    for await (const ev of runAssistant({
      db,
      orgId: ctx.orgId,
      provider: deps.provider,
      embeddings: deps.embeddings,
      tools: deps.tools,
      employee: {
        id: employee.id,
        name: employee.name,
        systemPrompt: employee.systemPrompt,
        model: employee.model,
        temperature: employee.temperature,
        maxTokens: employee.maxTokens,
      },
      history: prep.history,
      userMessage: content,
    })) {
      if (ev.type === 'citations') {
        citations = ev.citations;
        yield { type: 'citations', citations };
      } else if (ev.type === 'token') {
        text += ev.text;
        yield { type: 'token', text: ev.text };
      } else {
        usage = ev.usage;
        model = ev.model;
      }
    }
  } catch (err) {
    yield { type: 'error', error: err instanceof Error ? err.message : 'Generation failed' };
    return;
  }

  const latencyMs = Date.now() - started;
  const costUsd = estimateCostUsd(model, usage.promptTokens, usage.completionTokens);

  // 2. Persist the assistant message + usage + conversation bookkeeping.
  await withOrg(db, ctx.orgId, async (tx) => {
    await repo.insertMessage(tx, {
      id: assistantMessageId,
      orgId: ctx.orgId,
      conversationId,
      role: 'assistant',
      content: citations.length > 0 ? [textBlock(text), { type: 'citations', citations }] : [textBlock(text)],
      model,
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens,
      latencyMs,
    });
    await repo.incrementUsage(tx, ctx.orgId, 'tokens_in', usage.promptTokens);
    await repo.incrementUsage(tx, ctx.orgId, 'tokens_out', usage.completionTokens);
    await repo.incrementUsage(tx, ctx.orgId, 'tasks', 1);
    await repo.updateConversation(tx, conversationId, {
      lastMessageAt: new Date(),
      ...(prep.conv.title ? {} : { title: deriveTitle(content) }),
    });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: 'conversation.message',
      targetType: 'conversation',
      targetId: conversationId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { model, ...usage },
    });
  });

  const info: UsageInfo = {
    model,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    costUsd,
    latencyMs,
  };
  yield { type: 'done', usage: info };
}

/* ------------------------------- summarize -------------------------------- */

export async function summarizeConversationService(
  db: Db,
  ctx: ConversationContext,
  deps: RuntimeDeps,
  id: string,
): Promise<ConversationView | null> {
  const loaded = await withOrg(db, ctx.orgId, async (tx) => {
    const conv = await repo.findConversationById(tx, id);
    if (!conv) return null;
    const msgs = await repo.listMessages(tx, id);
    return { conv, msgs };
  });
  if (!loaded) return null;

  const transcript = loaded.msgs
    .map((m) => `${m.role}: ${extractText(m.content)}`)
    .join('\n')
    .slice(0, 12_000);

  let summary = '';
  for await (const ev of deps.provider.stream({
    model: deps.provider.resolveModel(),
    system: 'Summarize the following conversation in 1-2 sentences. Be factual and concise.',
    messages: [{ role: 'user', content: transcript || '(empty conversation)' }],
  })) {
    if (ev.type === 'text') summary += ev.delta;
  }

  return withOrg(db, ctx.orgId, async (tx) => {
    const row = await repo.updateConversation(tx, id, { summary: summary.trim() || null });
    if (!row) return null;
    const messageCount = await repo.conversationMessageCount(tx, id);
    return toConversationView({ ...row, messageCount });
  });
}
