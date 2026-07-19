'use client';

import { Check, Clock, X } from 'lucide-react';
import { Button, Card, CardContent, EmptyState } from '@aie/ui';
import { Bot } from 'lucide-react';
import { formatRelative } from '@/lib/format';

const pendingActions = [
  { id: 'a1', title: 'Send reply to Priya Raman', detail: 'Pricing for 25 seats — drafted, awaiting approval', at: '2026-07-18T16:22:00Z', kind: 'Send email' },
  { id: 'a2', title: 'Issue refund $180', detail: 'Order #A-58610 — within policy, awaiting approval', at: '2026-07-18T14:03:00Z', kind: 'Refund' },
];

export default function EmployeeActions() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-text-2">
        Actions this employee has proposed. Approve to execute, or reject to send it back.
      </p>
      {pendingActions.length === 0 ? (
        <EmptyState icon={Bot} title="Nothing awaiting approval" description="Approve-first actions will queue here for review." />
      ) : (
        <div className="flex flex-col gap-3">
          {pendingActions.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex flex-wrap items-center gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-warning-soft text-warning">
                  <Clock className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-[13px] text-text-2">{a.detail}</p>
                  <p className="mt-0.5 text-[12px] text-text-3">{a.kind} · {formatRelative(a.at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <X className="size-4" /> Reject
                  </Button>
                  <Button size="sm">
                    <Check className="size-4" /> Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
