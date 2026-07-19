'use client';

import { Card, CardContent } from '@aie/ui';
import { cn } from '@aie/ui';
import { employeeLogs } from '@/lib/mock/employees';

const levelTone = {
  info: 'text-text-3',
  warn: 'text-warning',
  error: 'text-danger',
};

export default function EmployeeLogs() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-2">Recent runtime events for this employee. Streams live in production.</p>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border font-mono text-[13px]">
            {employeeLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-4 py-2.5">
                <time className="shrink-0 tabular-nums text-text-3">
                  {new Date(log.ts).toLocaleTimeString('en-US', { hour12: false })}
                </time>
                <span className={cn('w-12 shrink-0 font-semibold uppercase', levelTone[log.level])}>
                  {log.level}
                </span>
                <span className="text-text-2">{log.message}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
