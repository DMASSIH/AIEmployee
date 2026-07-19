'use client';

import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@aie/ui';
import { workers } from '@/lib/mock/admin';
import { formatRelative } from '@/lib/format';

const tone = { running: 'success', draining: 'warning', stopped: 'neutral' } as const;

export default function AdminWorkersPage() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Worker</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Host</TableHead>
          <TableHead className="text-right">Active jobs</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {workers.map((w) => (
          <TableRow key={w.id}>
            <TableCell className="font-mono text-[13px] font-medium">{w.id}</TableCell>
            <TableCell>{w.type}</TableCell>
            <TableCell className="text-text-2">{w.host}</TableCell>
            <TableCell className="text-right tabular-nums">{w.jobs}</TableCell>
            <TableCell className="text-text-2">{formatRelative(w.startedAt)}</TableCell>
            <TableCell>
              <Badge tone={tone[w.status]} dot className="capitalize">
                {w.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
