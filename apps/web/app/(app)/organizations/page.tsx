'use client';

import { useState } from 'react';
import { Building2, Check, Plus } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  ErrorState,
  Skeleton,
  toast,
} from '@aie/ui';
import { PageHeader } from '@/components/shell/page-header';
import { CreateOrgDialog } from '@/components/orgs/create-org-dialog';
import { useCurrentOrg, useOrganizations, useSwitchOrg } from '@/hooks/use-orgs';

const roleTone: Record<string, 'accent' | 'info' | 'neutral'> = {
  owner: 'accent',
  admin: 'info',
  manager: 'info',
  member: 'neutral',
  billing: 'neutral',
};

export default function OrganizationsPage() {
  const { data: orgs, isLoading, isError, refetch } = useOrganizations();
  const { data: current } = useCurrentOrg();
  const switchOrg = useSwitchOrg();
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Organizations"
        description="Workspaces you belong to. Switch between them or create a new one."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New organization
          </Button>
        }
      />

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      )}

      {isError && <ErrorState onRetry={() => void refetch()} />}

      {orgs && orgs.length === 0 && (
        <EmptyState
          icon={Building2}
          title="No organizations yet"
          description="Create your first workspace to start hiring AI employees."
          action={{ label: 'Create organization', onClick: () => setCreating(true) }}
        />
      )}

      {orgs && orgs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => {
            const active = org.id === current?.id;
            return (
              <Card key={org.id} className={active ? 'ring-2 ring-accent/30' : undefined}>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <Avatar name={org.name} size="lg" />
                    {active ? (
                      <Badge tone="accent" dot>
                        Active
                      </Badge>
                    ) : (
                      <Badge tone={roleTone[org.role]} className="capitalize">
                        {org.role}
                      </Badge>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{org.name}</h3>
                    <p className="truncate text-[13px] text-text-3">
                      {org.slug} · <span className="capitalize">{org.plan}</span> plan
                    </p>
                  </div>
                  <Button
                    variant={active ? 'outline' : 'secondary'}
                    size="sm"
                    disabled={active || switchOrg.isPending}
                    onClick={() =>
                      switchOrg.mutate(org.id, {
                        onSuccess: (o) => toast.success(`Switched to ${o.name}`),
                        onError: () => toast.error('Could not switch organization'),
                      })
                    }
                  >
                    {active ? (
                      <>
                        <Check className="size-4" /> Current workspace
                      </>
                    ) : (
                      'Switch to this'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateOrgDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
