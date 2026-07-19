'use client';

import { BrainCircuit, Lightbulb, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardContent, EmptyState } from '@aie/ui';
import { memoryEntries } from '@/lib/mock/employees';
import { formatRelative } from '@/lib/format';

const kindMeta = {
  correction: { tone: 'danger', icon: Pencil, label: 'Correction' },
  fact: { tone: 'info', icon: Lightbulb, label: 'Fact' },
  preference: { tone: 'accent', icon: BrainCircuit, label: 'Preference' },
} as const;

export default function EmployeeMemory() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-2">
          Long-term memory persists corrections and preferences across every conversation.
        </p>
        <Button variant="outline" size="sm">
          <Plus className="size-4" /> Add memory
        </Button>
      </div>

      {memoryEntries.length === 0 ? (
        <EmptyState icon={BrainCircuit} title="No memories yet" description="Corrections and preferences will appear here as the employee learns." />
      ) : (
        <div className="flex flex-col gap-3">
          {memoryEntries.map((m) => {
            const meta = kindMeta[m.kind];
            return (
              <Card key={m.id}>
                <CardContent className="flex items-start gap-4">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-2">
                    <meta.icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <span className="text-[12px] text-text-3">{formatRelative(m.createdAt)}</span>
                    </div>
                    <p className="text-sm text-text">{m.content}</p>
                    <p className="mt-1 text-[13px] text-text-3">{m.source}</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label="Delete memory">
                    <Trash2 className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
