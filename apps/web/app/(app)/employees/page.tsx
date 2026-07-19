'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Bot, LayoutGrid, List, Plus } from 'lucide-react';
import {
  Avatar,
  Button,
  Card,
  CardContent,
  EmptyState,
  ErrorState,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@aie/ui';
import { PageHeader } from '@/components/shell/page-header';
import { AutonomyBadge, StatusBadge, VisibilityBadge } from '@/components/employees/employee-bits';
import { useEmployees } from '@/hooks/use-employees';
import { formatRelative } from '@/lib/format';

export default function EmployeesPage() {
  const router = useRouter();
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  const params = useMemo(
    () => ({ q: query.trim() || undefined, status: status === 'all' ? undefined : status }),
    [query, status],
  );
  const { data, isLoading, isError, refetch } = useEmployees(params);
  const items = data?.items ?? [];

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
            <SelectItem value="archived">Archived</SelectItem>
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

      {isError ? (
        <ErrorState
          title="Could not load employees"
          description="Something went wrong fetching your team."
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No employees yet"
          description="Hire your first AI employee to get started."
          action={{ label: 'Hire employee', onClick: () => router.push('/employees/new') }}
        />
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((e) => (
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
                  <p className="line-clamp-2 text-[13px] leading-relaxed text-text-2">
                    {e.description}
                  </p>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <AutonomyBadge autonomy={e.autonomy} />
                    <VisibilityBadge visibility={e.visibility} />
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
              <TableHead>Visibility</TableHead>
              <TableHead>Model</TableHead>
              <TableHead className="text-right">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((e) => (
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
                <TableCell>
                  <VisibilityBadge visibility={e.visibility} />
                </TableCell>
                <TableCell className="text-[13px] text-text-2">{e.model}</TableCell>
                <TableCell className="text-right text-[13px] text-text-3">
                  {formatRelative(e.updatedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
