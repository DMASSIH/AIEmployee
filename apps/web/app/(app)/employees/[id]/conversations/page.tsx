'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, Card, CardContent, EmptyState } from '@aie/ui';
import { MessagesSquare } from 'lucide-react';
import { useEmployee } from '@/hooks/use-employees';
import { conversations } from '@/lib/mock/conversations';
import { formatRelative } from '@/lib/format';

const statusTone = { open: 'info', resolved: 'success', escalated: 'danger' } as const;

export default function EmployeeConversations() {
  const { id } = useParams<{ id: string }>();
  const { data: employee } = useEmployee(id);
  const list = conversations.filter((c) => c.employee === employee?.name);

  if (list.length === 0) {
    return <EmptyState icon={MessagesSquare} title="No conversations yet" description="Conversations handled by this employee will appear here." />;
  }

  return (
    <div className="flex flex-col gap-2">
      {list.map((c) => (
        <Link key={c.id} href={`/conversations/${c.id}`}>
          <Card className="transition-colors hover:bg-surface-2/50">
            <CardContent className="flex items-center gap-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.subject}</p>
                <p className="truncate text-[13px] text-text-3">
                  {c.contact} · {c.channel} · {formatRelative(c.updatedAt)}
                </p>
              </div>
              <Badge tone={statusTone[c.status]} className="capitalize">
                {c.status}
              </Badge>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
