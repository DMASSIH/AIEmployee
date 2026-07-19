'use client';

import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@aie/ui';
import { queues } from '@/lib/mock/admin';

export default function AdminQueuesPage() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Queue</TableHead>
          <TableHead className="text-right">Waiting</TableHead>
          <TableHead className="text-right">Active</TableHead>
          <TableHead className="text-right">Failed</TableHead>
          <TableHead className="text-right">Throughput</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {queues.map((q) => (
          <TableRow key={q.name}>
            <TableCell className="font-mono text-[13px] font-medium">{q.name}</TableCell>
            <TableCell className="text-right tabular-nums">{q.waiting}</TableCell>
            <TableCell className="text-right tabular-nums text-accent">{q.active}</TableCell>
            <TableCell className="text-right">
              {q.failed > 0 ? (
                <Badge tone="danger">{q.failed}</Badge>
              ) : (
                <span className="tabular-nums text-text-3">0</span>
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums text-text-2">{q.throughput}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
