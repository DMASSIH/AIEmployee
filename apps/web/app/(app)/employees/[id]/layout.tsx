'use client';

import Link from 'next/link';
import { notFound, usePathname, useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft, MoreHorizontal, Pause, Play, Settings2 } from 'lucide-react';
import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  TabNav,
  TabNavItem,
} from '@aie/ui';
import { AutonomyBadge, StatusBadge } from '@/components/employees/employee-bits';
import { employeeById } from '@/lib/mock/employees';

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
  const employee = employeeById(params.id);
  if (!employee) notFound();

  const base = `/employees/${employee.id}`;
  const activeSeg = pathname === base ? '' : pathname.slice(base.length + 1).split('/')[0];

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
            </div>
            <p className="mt-0.5 text-sm text-text-2">{employee.roleTitle}</p>
            <div className="mt-2 flex items-center gap-2">
              <AutonomyBadge autonomy={employee.autonomy} />
              <span className="text-[13px] text-text-3">{employee.model}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            {employee.status === 'paused' ? <Play className="size-4" /> : <Pause className="size-4" />}
            {employee.status === 'paused' ? 'Resume' : 'Pause'}
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
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem>Export configuration</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive>Archive employee</DropdownMenuItem>
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
    </div>
  );
}
