'use client';

import { GitBranch } from 'lucide-react';
import { Badge, Button, Card, CardContent } from '@aie/ui';
import { promptVersions } from '@/lib/mock/employees';
import { formatRelative } from '@/lib/format';

export default function EmployeeVersions() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-text-2">Every prompt change is a version. Roll back instantly if an edit misbehaves.</p>
      <ol className="relative flex flex-col">
        {promptVersions.map((v, i) => (
          <li key={v.version} className="flex gap-4 pb-6 last:pb-0">
            <div className="flex flex-col items-center">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                  v.active ? 'bg-accent text-white' : 'bg-surface-2 text-text-2'
                }`}
              >
                <GitBranch className="size-4" />
              </span>
              {i < promptVersions.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
            </div>
            <Card className="flex-1">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Version {v.version}</p>
                    {v.active && <Badge tone="accent" dot>Active</Badge>}
                  </div>
                  <p className="mt-0.5 text-[13px] text-text-2">{v.changelog}</p>
                  <p className="mt-0.5 text-[12px] text-text-3">
                    {v.author} · {formatRelative(v.createdAt)}
                  </p>
                </div>
                {!v.active && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">Diff</Button>
                    <Button variant="outline" size="sm">Restore</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
