'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Send, Sparkles } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Markdown,
  Skeleton,
  toast,
} from '@aie/ui';
import type { Citation, MessageView, StreamEvent, UsageInfo } from '@aie/core';
import { useConversation, useMessages } from '@/hooks/use-conversations';
import { api, ApiError } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { conversationKeys } from '@/hooks/use-conversations';

const statusTone = { open: 'info', resolved: 'success', escalated: 'danger' } as const;

interface Turn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  usage?: UsageInfo;
  streaming?: boolean;
}

function toTurn(m: MessageView): Turn {
  return {
    id: m.id,
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
    citations: m.citations,
    usage:
      m.model && m.totalTokens !== null
        ? {
            model: m.model,
            promptTokens: m.promptTokens ?? 0,
            completionTokens: m.completionTokens ?? 0,
            totalTokens: m.totalTokens,
            costUsd: m.costUsd ?? 0,
            latencyMs: m.latencyMs ?? 0,
          }
        : undefined,
  };
}

export default function ConversationDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: conv, isError, error } = useConversation(id);
  const { data: serverMessages, isLoading } = useMessages(id);

  const [thread, setThread] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoSent = useRef(false);

  // Seed the thread from the server when not mid-stream.
  useEffect(() => {
    if (serverMessages && !sending) setThread(serverMessages.map(toTurn));
  }, [serverMessages, sending]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [thread]);

  const send = async (content: string) => {
    if (!content.trim() || sending) return;
    setSending(true);
    setInput('');
    const userTurn: Turn = { id: `local-${Date.now()}`, role: 'user', content, citations: [] };
    const assistantTurn: Turn = { id: `pending-${Date.now()}`, role: 'assistant', content: '', citations: [], streaming: true };
    setThread((t) => [...t, userTurn, assistantTurn]);

    const patchAssistant = (fn: (t: Turn) => Turn) =>
      setThread((t) => t.map((turn) => (turn.id === assistantTurn.id ? fn(turn) : turn)));

    try {
      await api.conversations.streamMessage(id, content, (event: StreamEvent) => {
        if (event.type === 'token') patchAssistant((t) => ({ ...t, content: t.content + event.text }));
        else if (event.type === 'citations') patchAssistant((t) => ({ ...t, citations: event.citations }));
        else if (event.type === 'done') patchAssistant((t) => ({ ...t, usage: event.usage, streaming: false }));
        else if (event.type === 'error') {
          patchAssistant((t) => ({ ...t, content: t.content || `⚠️ ${event.error}`, streaming: false }));
          toast.error('Generation failed', event.error);
        }
      });
    } catch (err) {
      patchAssistant((t) => ({ ...t, streaming: false, content: t.content || '⚠️ Failed to reach the model.' }));
      toast.error('Streaming failed', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setSending(false);
      void qc.invalidateQueries({ queryKey: conversationKeys.messages(id) });
      void qc.invalidateQueries({ queryKey: conversationKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: conversationKeys.all });
    }
  };

  // Auto-send a first message queued from the "new conversation" dialog.
  useEffect(() => {
    if (autoSent.current || isLoading) return;
    const pending = sessionStorage.getItem(`pending-msg-${id}`);
    if (pending) {
      autoSent.current = true;
      sessionStorage.removeItem(`pending-msg-${id}`);
      void send(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isLoading]);

  if (isError && error instanceof ApiError && error.status === 404) notFound();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  return (
    <div className="flex flex-col gap-5">
      <Link href="/conversations" className="inline-flex w-fit items-center gap-1.5 text-sm text-text-2 hover:text-text">
        <ArrowLeft className="size-4" /> All conversations
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{conv?.title ?? 'Conversation'}</h1>
            {conv && (
              <Badge tone={statusTone[conv.status]} className="capitalize">
                {conv.status}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-text-2">
            {conv?.employeeName ? `with ${conv.employeeName}` : 'AI conversation'}
          </p>
        </div>
      </div>

      <Card className="flex h-[600px] flex-col">
        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-5">
          {isLoading ? (
            <>
              <Skeleton className="h-16 w-2/3 rounded-lg" />
              <Skeleton className="ml-auto h-16 w-2/3 rounded-lg" />
            </>
          ) : thread.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Sparkles className="size-5" />
              </span>
              <p className="text-sm font-medium">Start the conversation</p>
              <p className="max-w-xs text-[13px] text-text-3">
                Ask a question — replies are grounded in your knowledge base with citations.
              </p>
            </div>
          ) : (
            thread.map((turn) =>
              turn.role === 'user' ? (
                <div key={turn.id} className="ml-auto w-fit max-w-xl rounded-lg rounded-tr-sm bg-accent px-4 py-2.5 text-sm text-white">
                  {turn.content}
                </div>
              ) : (
                <div key={turn.id} className="flex w-fit max-w-xl gap-2.5">
                  <Avatar name={conv?.employeeName ?? 'AI'} size="sm" className="mt-0.5" />
                  <div className="min-w-0">
                    <div className="rounded-lg rounded-tl-sm bg-surface-2 px-4 py-2.5">
                      {turn.content ? (
                        <Markdown content={turn.content} className="text-text" />
                      ) : (
                        <span className="inline-flex gap-1">
                          <span className="size-1.5 animate-bounce rounded-full bg-text-3 [animation-delay:-0.2s]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-text-3 [animation-delay:-0.1s]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-text-3" />
                        </span>
                      )}
                      {turn.streaming && turn.content && <span className="ml-0.5 animate-pulse">▍</span>}
                    </div>
                    {turn.citations.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {turn.citations.map((c) => (
                          <Badge key={c.chunkId} tone="neutral" className="text-[11px]">
                            [{c.index}] {c.sourceName}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {turn.usage && (
                      <p className="mt-1 text-[11px] text-text-3">
                        {turn.usage.model} · {turn.usage.totalTokens} tokens · ${turn.usage.costUsd.toFixed(4)} ·{' '}
                        {(turn.usage.latencyMs / 1000).toFixed(1)}s
                      </p>
                    )}
                  </div>
                </div>
              ),
            )
          )}
        </div>

        <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-border p-3">
          <Input
            placeholder="Message your employee…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <Button type="submit" size="icon" aria-label="Send" disabled={!input.trim() || sending}>
            <Send className="size-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
