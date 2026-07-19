'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
  toast,
} from '@aie/ui';
import { useCurrentOrg, useOrganizations, useSwitchOrg } from '@/hooks/use-orgs';
import { CreateOrgDialog } from '@/components/orgs/create-org-dialog';

/** Real backend: lists the user's orgs, shows the active one, switches via the API. */
export function OrgSwitcher() {
  const router = useRouter();
  const { data: orgs, isLoading } = useOrganizations();
  const { data: current } = useCurrentOrg();
  const switchOrg = useSwitchOrg();
  const [creating, setCreating] = useState(false);

  if (isLoading) return <Skeleton className="h-10 w-full" />;

  const active = current ?? orgs?.[0] ?? null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex w-full items-center gap-2.5 rounded-md border border-border bg-surface p-2 text-left shadow-card outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent/30"
          aria-label="Switch organization"
        >
          {active ? (
            <>
              <Avatar name={active.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium leading-tight">{active.name}</span>
                <span className="block text-[11px] capitalize leading-tight text-text-3">
                  {active.plan} · {active.role}
                </span>
              </span>
            </>
          ) : (
            <>
              <span className="flex size-6 items-center justify-center rounded-full bg-surface-2 text-text-3">
                <Building2 className="size-3.5" />
              </span>
              <span className="flex-1 text-[13px] font-medium text-text-2">Choose workspace</span>
            </>
          )}
          <ChevronsUpDown className="size-4 shrink-0 text-text-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          {(orgs ?? []).map((org) => (
            <DropdownMenuItem
              key={org.id}
              onSelect={() => {
                if (org.id === active?.id) return;
                switchOrg.mutate(org.id, {
                  onSuccess: (o) => toast.success(`Switched to ${o.name}`),
                  onError: () => toast.error('Could not switch organization'),
                });
              }}
            >
              <Avatar name={org.name} size="sm" />
              <span className="flex-1 truncate">{org.name}</span>
              {org.id === active?.id && <Check className="size-4 text-accent" />}
            </DropdownMenuItem>
          ))}
          {(orgs ?? []).length === 0 && (
            <p className="px-2.5 py-2 text-[13px] text-text-3">No organizations yet.</p>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreating(true)}>
            <Plus /> New organization
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push('/organizations')}>
            <Building2 /> Manage organizations
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateOrgDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
