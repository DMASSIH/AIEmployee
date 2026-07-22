'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { MessagesSquare, Plus } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  EmptyState,
  Field,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from '@aie/ui';
import { PageHeader } from '@/components/shell/page-header';
import { useConversations, useCreateConversation } from '@/hooks/use-conversations';
import { useEmployees } from '@/hooks/use-employees';
import { ApiError } from '@/lib/api';
import { formatRelative } from '@/lib/format';

const statusTone = { open: 'info', resolved: 'success', escalated: 'danger' } as const;

export default function ConversationsPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [newOpen, setNewOpen] = useState(false);

  const params = useMemo(
    () => ({ q: query.trim() || undefined, status: filter === 'all' ? undefined : filter }),
    [query, filter],
  );
  const { data, isLoading } = useConversations(params);
  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Conversations"
        description="Chat with your AI employees — grounded in your knowledge base."
        actions={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="size-4" /> New conversation
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="escalated">Escalated</TabsTrigger>
          </TabsList>
        </Tabs>
        <SearchInput
          className="w-full sm:max-w-xs"
          placeholder="Search conversations…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No conversations yet"
          description="Start a conversation with one of your AI employees."
          action={{ label: 'New conversation', onClick: () => setNewOpen(true) }}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((c) => (
            <Link key={c.id} href={`/conversations/${c.id}`}>
              <Card className="transition-colors hover:bg-surface-2/40">
                <CardContent className="flex items-center gap-4 py-3.5">
                  <Avatar name={c.employeeName ?? 'AI'} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.title ?? 'Untitled conversation'}</p>
                    <p className="truncate text-[13px] text-text-3">
                      {c.employeeName ?? 'Unassigned'} · {c.messageCount} message
                      {c.messageCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  {c.lastMessageAt && (
                    <span className="hidden text-[13px] text-text-3 sm:block">
                      {formatRelative(c.lastMessageAt)}
                    </span>
                  )}
                  <Badge tone={statusTone[c.status]} className="capitalize">
                    {c.status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <NewConversationDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

function NewConversationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const { data: employees } = useEmployees({ pageSize: 100 });
  const create = useCreateConversation();
  const [employeeId, setEmployeeId] = useState('');
  const [message, setMessage] = useState('');
  const list = employees?.items ?? [];

  const start = async () => {
    if (!employeeId) return;
    try {
      const conv = await create.mutateAsync({ employeeId, message: message.trim() || undefined });
      if (message.trim()) sessionStorage.setItem(`pending-msg-${conv.id}`, message.trim());
      onOpenChange(false);
      setMessage('');
      router.push(`/conversations/${conv.id}`);
    } catch (err) {
      toast.error('Could not start conversation', err instanceof ApiError ? err.message : 'Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader title="New conversation" description="Pick an employee and say hello." />
        <div className="flex flex-col gap-4">
          <Field label="Employee" required>
            {(p) => (
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger id={p.id}>
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {list.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} — {e.roleTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
          <Field label="First message">
            {(p) => (
              <Textarea
                {...p}
                rows={3}
                placeholder="Ask a question…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            )}
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={start} disabled={!employeeId || create.isPending}>
            Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
