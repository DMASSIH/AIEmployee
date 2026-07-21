'use client';

import { useParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { RotateCcw, Send, Sparkles } from 'lucide-react';
import {
  Avatar,
  Button,
  Card,
  CardContent,
  Input,
  Markdown,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aie/ui';
import { useEmployee } from '@/hooks/use-employees';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const seededReply =
  "Thanks for reaching out! Based on our refund policy, orders can be returned within **30 days** of delivery for a full refund. Since your order shipped on July 12, you're well within the window. Would you like me to start the return, or is there anything else I can help with?";

export default function EmployeePlayground() {
  const { id } = useParams<{ id: string }>();
  const { data: e } = useEmployee(id);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  const send = (ev: FormEvent) => {
    ev.preventDefault();
    if (!input.trim()) return;
    const userMsg: Msg = { role: 'user', content: input };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'assistant', content: seededReply }]);
      setThinking(false);
    }, 900);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <Card className="flex h-[560px] flex-col">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2.5">
            <Avatar name={e?.name ?? 'AI'} size="sm" />
            <div>
              <p className="text-sm font-medium">{e?.name}</p>
              <p className="text-[12px] text-text-3">Test conversation · not saved</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setMessages([])}>
            <RotateCcw className="size-4" /> Reset
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Sparkles className="size-5" />
              </span>
              <p className="text-sm font-medium">Test {e?.name} before going live</p>
              <p className="max-w-xs text-[13px] text-text-3">
                Send a message as a customer would. Responses use the active prompt and knowledge.
              </p>
            </div>
          )}
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="max-w-md rounded-lg rounded-tr-sm bg-accent px-4 py-2.5 text-sm text-white ml-auto w-fit">
                {m.content}
              </div>
            ) : (
              <div key={i} className="flex w-fit max-w-md gap-2.5">
                <Avatar name={e?.name ?? 'AI'} size="sm" className="mt-0.5" />
                <div className="rounded-lg rounded-tl-sm bg-surface-2 px-4 py-2.5">
                  <Markdown content={m.content} className="text-text" />
                </div>
              </div>
            ),
          )}
          {thinking && (
            <div className="flex items-center gap-2 text-[13px] text-text-3">
              <Avatar name={e?.name ?? 'AI'} size="sm" />
              <span className="flex gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-text-3 [animation-delay:-0.2s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-text-3 [animation-delay:-0.1s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-text-3" />
              </span>
            </div>
          )}
        </div>

        <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
          <Input
            placeholder="Message your employee…"
            value={input}
            onChange={(ev) => setInput(ev.target.value)}
          />
          <Button type="submit" size="icon" aria-label="Send" disabled={!input.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      </Card>

      <Card className="h-fit">
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm font-medium">Test settings</p>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-text-2">Prompt version</label>
            <Select defaultValue="active">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">v{e?.promptVersion} (active)</SelectItem>
                <SelectItem value="draft">Working draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-text-2">Channel</label>
            <Select defaultValue="widget">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="widget">Web widget</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-[12px] leading-relaxed text-text-3">
            Playground runs are previews and never touch real customers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
