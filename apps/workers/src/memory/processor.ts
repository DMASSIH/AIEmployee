import { withOrg, schema, eq, and, asc, type Db } from '@aie/db';
import type { MemoryJobData } from '@aie/core';
import { renderTranscript, type MemoryEngine, type TranscriptTurn } from '@aie/memory';

export interface MemoryDeps {
  db: Db;
  engine: MemoryEngine;
  /** Retention window for the cleanup task (days). */
  cleanupDays: number;
}

export interface MemoryResult {
  task: MemoryJobData['task'];
  /** Free-form per-task summary for the worker log line. */
  detail: string;
}

const { conversations, messages } = schema;

interface TextBlock {
  type: 'text';
  text: string;
}

/** Render a message's JSONB content blocks back to plain text (mirrors the API). */
function extractText(content: unknown): string {
  if (!Array.isArray(content)) return '';
  return content
    .filter((b): b is TextBlock => (b as TextBlock)?.type === 'text')
    .map((b) => b.text)
    .join('');
}

/** Load a conversation's transcript + employee scope, org-scoped by RLS. */
async function loadTranscript(
  db: Db,
  orgId: string,
  conversationId: string,
): Promise<{ turns: TranscriptTurn[]; employeeId: string } | null> {
  return withOrg(db, orgId, async (tx) => {
    const [conv] = await tx
      .select({ id: conversations.id, employeeId: conversations.employeeId })
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.orgId, orgId)))
      .limit(1);
    if (!conv) return null;
    const rows = await tx
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(and(eq(messages.conversationId, conversationId), eq(messages.orgId, orgId)))
      .orderBy(asc(messages.createdAt));
    const turns: TranscriptTurn[] = rows.map((m) => ({
      role: m.role,
      content: extractText(m.content),
    }));
    return { turns, employeeId: conv.employeeId };
  });
}

/**
 * THE memory worker's job handler. One switch over MemoryTask — all heavy AI /
 * embedding work runs here, never in a request handler. Every task is
 * org-scoped through the MemoryEngine (which uses withOrg internally) and safe
 * to retry: extract dedupes, embed/reindex are idempotent recomputations, and
 * summarize/cleanup are last-writer-wins.
 */
export async function runMemory(job: MemoryJobData, deps: MemoryDeps): Promise<MemoryResult> {
  const { db, engine } = deps;

  switch (job.task) {
    case 'extract': {
      if (!job.conversationId) throw new Error('memory.extract requires conversationId');
      const loaded = await loadTranscript(db, job.orgId, job.conversationId);
      if (!loaded) return { task: 'extract', detail: 'conversation not found' };
      const transcript = renderTranscript(loaded.turns);
      const res = await engine.extractFromConversation({
        orgId: job.orgId,
        conversationId: job.conversationId,
        transcript,
        employeeId: loaded.employeeId,
        createdBy: job.actorId,
      });
      return {
        task: 'extract',
        detail: `${res.inserted.length} stored / ${res.extracted} extracted / ${res.deduped} deduped`,
      };
    }

    case 'summarize': {
      if (!job.conversationId) throw new Error('memory.summarize requires conversationId');
      const loaded = await loadTranscript(db, job.orgId, job.conversationId);
      if (!loaded) return { task: 'summarize', detail: 'conversation not found' };
      const transcript = renderTranscript(loaded.turns);
      const summary = await engine.summarize(transcript);
      await withOrg(db, job.orgId, (tx) =>
        tx
          .update(conversations)
          .set({ summary: summary || null, updatedAt: new Date() })
          .where(and(eq(conversations.id, job.conversationId!), eq(conversations.orgId, job.orgId))),
      );
      return { task: 'summarize', detail: summary ? `${summary.length} chars` : 'empty' };
    }

    case 'embed': {
      const res = await engine.embedPending(job.orgId);
      return { task: 'embed', detail: `${res.embedded} embedded` };
    }

    case 'reindex': {
      const res = await engine.reindex(job.orgId, job.memoryId);
      return { task: 'reindex', detail: `${res.reindexed} reindexed` };
    }

    case 'cleanup': {
      const res = await engine.cleanup(job.orgId, deps.cleanupDays);
      return { task: 'cleanup', detail: `${res.purged} purged` };
    }

    default: {
      const _exhaustive: never = job.task;
      throw new Error(`unknown memory task: ${String(_exhaustive)}`);
    }
  }
}
