'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Bot, LayoutGrid, List, Plus } from 'lucide-react';
import {
  Avatar,
  Button,
  Card,
  CardContent,
  EmptyState,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@aie/ui';
import { PageHeader } from '@/components/shell/page-header';
import { AutonomyBadge, StatusBadge } from '@/components/employees/employee-bits';
import { employees } from '@/lib/mock/employees';
import { formatCurrency, formatNumber } from '@/lib/format';

export default function EmployeesPage() {
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  const filtered = useMemo(
    () =>
      employees.filter((e) => {
        const matchesQuery =
          e.name.toLowerCase().includes(query.toLowerCase()) ||
          e.roleTitle.toLowerCase().includes(query.toLowerCase());
        const matchesStatus = status === 'all' || e.status === status;
        return matchesQuery && matchesStatus;
      }),
    [query, status],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="AI Employees"
        description="Your digital team. Hire, train, and supervise from here."
        actions={
          <Button asChild>
            <Link href="/employees/new">
              <Plus className="size-4" /> Hire employee
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          className="w-full sm:max-w-xs"
          placeholder="Search employees…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto hidden items-center rounded-md border border-border bg-surface p-0.5 shadow-card sm:flex">
          {(['grid', 'table'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-label={`${v} view`}
              aria-pressed={view === v}
              className={cn(
                'flex size-7 items-center justify-center rounded-sm transition-colors',
                view === v ? 'bg-surface-2 text-text' : 'text-text-3 hover:text-text',
              )}
            >
              {v === 'grid' ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No employees match"
          description="Try a different search or hire your first AI employee."
          action={{ label: 'Hire employee' }}
        />
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <Link key={e.id} href={`/employees/${e.id}`}>
              <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop">
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={e.name} size="lg" />
                      <div>
                        <h3 className="font-semibold leading-tight">{e.name}</h3>
                        <p className="text-[13px] text-text-3">{e.roleTitle}</p>
                      </div>
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                  <p className="line-clamp-2 text-[13px] leading-relaxed text-text-2">{e.jobDescription}</p>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <AutonomyBadge autonomy={e.autonomy} />
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">{e.successRate}%</p>
                      <p className="text-[11px] text-text-3">success rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Autonomy</TableHead>
              <TableHead className="text-right">Conversations</TableHead>
              <TableHead className="text-right">Success</TableHead>
              <TableHead className="text-right">Cost (MTD)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((e) => (
              <TableRow key={e.id} interactive>
                <TableCell>
                  <Link href={`/employees/${e.id}`} className="flex items-center gap-3">
                    <Avatar name={e.name} />
                    <div>
                      <p className="font-medium">{e.name}</p>
                      <p className="text-[13px] text-text-3">{e.roleTitle}</p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge status={e.status} />
                </TableCell>
                <TableCell>
                  <AutonomyBadge autonomy={e.autonomy} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(e.conversations30d)}</TableCell>
                <TableCell className="text-right tabular-nums">{e.successRate}%</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(e.costMtd)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
