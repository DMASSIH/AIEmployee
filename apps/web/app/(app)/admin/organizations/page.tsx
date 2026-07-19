'use client';

import { useState } from 'react';
import {
  Avatar,
  Badge,
  SearchInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@aie/ui';
import { adminOrgs } from '@/lib/mock/admin';
import { formatNumber } from '@/lib/format';

const tone = { active: 'success', trial: 'info', past_due: 'danger' } as const;
const label = { active: 'Active', trial: 'Trial', past_due: 'Past due' };

export default function AdminOrgsPage() {
  const [query, setQuery] = useState('');
  const filtered = adminOrgs.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex flex-col gap-4">
      <SearchInput
        className="max-w-xs"
        placeholder="Search organizations…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organization</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead className="text-right">Employees</TableHead>
            <TableHead className="text-right">Tasks (MTD)</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((o) => (
            <TableRow key={o.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar name={o.name} size="sm" />
                  <span className="font-medium">{o.name}</span>
                </div>
              </TableCell>
              <TableCell className="capitalize text-text-2">{o.plan}</TableCell>
              <TableCell className="text-right tabular-nums">{o.employees}</TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(o.tasksMtd)}</TableCell>
              <TableCell>
                <Badge tone={tone[o.status]} dot>
                  {label[o.status]}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
