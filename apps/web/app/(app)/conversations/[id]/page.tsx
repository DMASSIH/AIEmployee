'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { ArrowLeft, Pin, Star, User } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Markdown,
} from '@aie/ui';
import { conversationById } from '@/lib/mock/conversations';
import { formatDate } from '@/lib/format';

const statusTone = { open: 'info', resolved: 'success', escalated: 'danger' } as const;

export default function ConversationDetail() {
  const { id } = useParams<{ id: string }>();
  const c = conversationById(id);
  if (!c) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Link href="/conversations" className="inline-flex w-fit items-center gap-1.5 text-sm text-text-2 hover:text-text">
        <ArrowLeft className="size-4" /> All conversations
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{c.subject}</h1>
            <Badge tone={statusTone[c.status]} className="capitalize">
              {c.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-text-2">
            {c.contact} · handled by {c.employee} · {c.channel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="Pin">
            <Pin className={c.pinned ? 'size-4.5 text-accent' : 'size-4.5'} />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Favorite">
            <Star className={c.favorite ? 'size-4.5 fill-warning text-warning' : 'size-4.5'} />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        {/* Transcript */}
        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {c.messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex gap-3">
                  <Avatar name={c.contact} size="sm" className="mt-0.5" />
                  <div className="min-w-0">
                    <p className="mb-1 text-[12px] text-text-3">
                      {c.contact} · {formatDate(m.at)}
                    </p>
                    <div className="w-fit max-w-lg rounded-lg rounded-tl-sm bg-surface-2 px-4 py-2.5 text-sm text-text">
                      {m.content}
                    </div>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex flex-row-reverse gap-3">
                  <Avatar name={c.employee} size="sm" className="mt-0.5" />
                  <div className="min-w-0">
                    <p className="mb-1 text-right text-[12px] text-text-3">
                      {c.employee} · {formatDate(m.at)}
                    </p>
                    <div className="ml-auto w-fit max-w-lg rounded-lg rounded-tr-sm bg-accent px-4 py-2.5 text-white">
                      <Markdown content={m.content} className="text-white [&_code]:bg-white/20 [&_code]:text-white [&_strong]:text-white" />
                    </div>
                  </div>
                </div>
              ),
            )}
          </CardContent>
        </Card>

        {/* Meta */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={c.contact} />
                <div>
                  <p className="text-sm font-medium">{c.contact}</p>
                  <p className="text-[13px] text-text-3">{c.channel}</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <User className="size-4" /> View contact
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5 text-sm">
              <Row label="Employee" value={c.employee} />
              <Row label="Channel" value={c.channel} />
              <Row label="Messages" value={String(c.messages.length)} />
              <Row label="Started" value={formatDate(c.messages[0]!.at)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-2">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
