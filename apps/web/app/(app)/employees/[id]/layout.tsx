'use client';

import Link from 'next/link';
import { notFound, usePathname, useParams, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ArrowLeft, MoreHorizontal, Pause, Play, Settings2 } from 'lucide-react';
import {
  Avatar,
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
  TabNav,
  TabNavItem,
  toast,
} from '@aie/ui';
import { AutonomyBadge, StatusBadge, VisibilityBadge } from '@/components/employees/employee-bits';
import {
  useDeleteEmployee,
  useDuplicateEmployee,
  useEmployee,
  useSetPublished,
  useUpdateEmployee,
} from '@/hooks/use-employees';
import { ApiError } from '@/lib/api';

const tabs = [
  { seg: '', label: 'Overview' },
  { seg: 'prompt', label: 'Prompt' },
  { seg: 'knowledge', label: 'Knowledge' },
  { seg: 'memory', label: 'Memory' },
  { seg: 'tools', label: 'Tools' },
  { seg: 'actions', label: 'Actions' },
  { seg: 'analytics', label: 'Analytics' },
  { seg: 'conversations', label: 'Conversations' },
  { seg: 'versions', label: 'Versions' },
  { seg: 'deployment', label: 'Deployment' },
  { seg: 'logs', label: 'Logs' },
  { seg: 'playground', label: 'Playground' },
];

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { data: employee, isLoading, isError, error } = useEmployee(params.id);

  const update = useUpdateEmployee(params.id);
  const duplicate = useDuplicateEmployee();
  const remove = useDeleteEmployee();
  const setPublished = useSetPublished(params.id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isError && error instanceof ApiError && error.status === 404) notFound();

  const base = `/employees/${params.id}`;
  const activeSeg = pathname === base ? '' : pathname.slice(base.length + 1).split('/')[0];

  if (isLoading || !employee) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-5 w-32 rounded" />
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-48 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
        </div>
        <Skeleton className="h-9 w-full rounded" />
      </div>
    );
  }

  const paused = employee.status === 'paused';
  const published = employee.visibility === 'published';

  const togglePause = async () => {
    try {
      await update.mutateAsync({ status: paused ? 'active' : 'paused' });
      toast.success(paused ? `${employee.name} resumed` : `${employee.name} paused`);
    } catch {
      toast.error('Action failed', 'Could not change the employee status.');
    }
  };

  const togglePublish = async () => {
    try {
      await setPublished.mutateAsync(!published);
      toast.success(published ? 'Unpublished' : 'Published', `${employee.name} is now ${published ? 'a draft' : 'live'}.`);
    } catch {
      toast.error('Action failed', 'Could not change visibility.');
    }
  };

  const onDuplicate = async () => {
    try {
      const copy = await duplicate.mutateAsync(employee.id);
      toast.success('Employee duplicated', `Created ${copy.name}.`);
      router.push(`/employees/${copy.id}`);
    } catch (err) {
      toast.error('Duplicate failed', err instanceof ApiError ? err.message : 'Please try again.');
    }
  };

  const onDelete = async () => {
    try {
      await remove.mutateAsync(employee.id);
      toast.success('Employee deleted', `${employee.name} was moved to trash.`);
      router.push('/employees');
    } catch {
      toast.error('Delete failed', 'Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Link href="/employees" className="inline-flex w-fit items-center gap-1.5 text-sm text-text-2 hover:text-text">
        <ArrowLeft className="size-4" /> All employees
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={employee.name} size="xl" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight">{employee.name}</h1>
              <StatusBadge status={employee.status} />
              <VisibilityBadge visibility={employee.visibility} />
            </div>
            <p className="mt-0.5 text-sm text-text-2">{employee.roleTitle}</p>
            <div className="mt-2 flex items-center gap-2">
              <AutonomyBadge autonomy={employee.autonomy} />
              <span className="text-[13px] text-text-3">{employee.model}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={togglePause} disabled={update.isPending}>
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            {paused ? 'Resume' : 'Pause'}
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`${base}/prompt`}>
              <Settings2 className="size-4" /> Configure
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More actions">
                <MoreHorizontal className="size-4.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={togglePublish}>
                {published ? 'Unpublish' : 'Publish'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onClick={() => setConfirmDelete(true)}>
                Delete employee
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <TabNav>
        {tabs.map((t) => (
          <TabNavItem key={t.seg} asChild active={activeSeg === t.seg}>
            <Link href={t.seg ? `${base}/${t.seg}` : base}>{t.label}</Link>
          </TabNavItem>
        ))}
      </TabNav>

      <div>{children}</div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${employee.name}?`}
        description="The employee will be moved to trash. You can restore it later."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={onDelete}
      />
    </div>
  );
}
