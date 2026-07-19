'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { MessagesSquare, Pin, Star } from 'lucide-react';
import {
  Avatar,
  Badge,
  Card,
  CardContent,
  EmptyState,
  SearchInput,
  Tabs,
  TabsList,
  TabsTrigger,
  cn,
} from '@aie/ui';
import { PageHeader } from '@/components/shell/page-header';
import { conversations } from '@/lib/mock/conversations';
import { formatRelative } from '@/lib/format';

const statusTone = { open: 'info', resolved: 'success', escalated: 'danger' } as const;

export default function ConversationsPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(
    () =>
      conversations.filter((c) => {
        const q =
          c.subject.toLowerCase().includes(query.toLowerCase()) ||
          c.contact.toLowerCase().includes(query.toLowerCase());
        const f =
          filter === 'all' ||
          (filter === 'pinned' && c.pinned) ||
          (filter === 'favorites' && c.favorite) ||
          filter === c.status;
        return q && f;
      }),
    [query, filter],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Conversations" description="Everything your AI employees are handling across every channel." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="escalated">Escalated</TabsTrigger>
            <TabsTrigger value="pinned">Pinned</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
          </TabsList>
        </Tabs>
        <SearchInput
          className="w-full sm:max-w-xs"
          placeholder="Search conversations…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={MessagesSquare} title="No conversations" description="Nothing matches this view yet." />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => (
            <Link key={c.id} href={`/conversations/${c.id}`}>
              <Card className="transition-colors hover:bg-surface-2/50">
                <CardContent className="flex items-center gap-4 py-3.5">
                  <Avatar name={c.contact} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {c.pinned && <Pin className="size-3.5 text-text-3" />}
                      {c.favorite && <Star className="size-3.5 fill-warning text-warning" />}
                      <p className="truncate text-sm font-medium">{c.subject}</p>
                    </div>
                    <p className="truncate text-[13px] text-text-3">{c.contact} · {c.employee} · {c.channel}</p>
                  </div>
                  <p className="hidden max-w-xs truncate text-[13px] text-text-2 lg:block">{c.preview}</p>
                  <span className="hidden shrink-0 text-[13px] text-text-3 sm:block">{formatRelative(c.updatedAt)}</span>
                  <Badge tone={statusTone[c.status]} className={cn('capitalize')}>
                    {c.status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
