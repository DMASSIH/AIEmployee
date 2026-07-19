'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@aie/ui';
import { systemLogs } from '@/lib/mock/admin';

const levelTone = { info: 'text-text-3', warn: 'text-warning', error: 'text-danger' };

export default function AdminLogsPage() {
  const [level, setLevel] = useState('all');
  const filtered = systemLogs.filter((l) => level === 'all' || l.level === level);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border font-mono text-[13px]">
            {filtered.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-4 py-2.5">
                <time className="shrink-0 tabular-nums text-text-3">
                  {new Date(log.ts).toLocaleTimeString('en-US', { hour12: false })}
                </time>
                <span className={cn('w-12 shrink-0 font-semibold uppercase', levelTone[log.level])}>
                  {log.level}
                </span>
                <span className="w-24 shrink-0 truncate text-accent">{log.service}</span>
                <span className="text-text-2">{log.message}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
