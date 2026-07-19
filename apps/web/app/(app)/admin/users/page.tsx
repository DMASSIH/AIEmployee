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
import { members } from '@/lib/mock/org';
import { formatRelative } from '@/lib/format';

/** Platform-wide user directory (representative sample). */
const users = members.map((m, i) => ({
  ...m,
  orgs: [2, 1, 1][i] ?? 1,
  verified: i !== 2,
}));

export default function AdminUsersPage() {
  const [query, setQuery] = useState('');
  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(query.toLowerCase()) || u.email.includes(query.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-4">
      <SearchInput
        className="max-w-xs"
        placeholder="Search users…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Organizations</TableHead>
            <TableHead>Last active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} size="sm" />
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-[13px] text-text-3">{u.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge tone={u.verified ? 'success' : 'warning'}>
                  {u.verified ? 'Verified' : 'Unverified'}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{u.orgs}</TableCell>
              <TableCell className="text-text-2">{formatRelative(u.lastActive)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
