'use client';

import { useParams } from 'next/navigation';
import { GitBranch } from 'lucide-react';
import { Badge, Button, Card, CardContent, EmptyState, Skeleton, toast } from '@aie/ui';
import { useActivatePromptVersion, useEmployeeVersions } from '@/hooks/use-employees';
import { ApiError } from '@/lib/api';
import { formatRelative } from '@/lib/format';

export default function EmployeeVersions() {
  const { id } = useParams<{ id: string }>();
  const { data: versions, isLoading } = useEmployeeVersions(id);
  const activate = useActivatePromptVersion(id);

  const restore = async (versionId: string, version: number) => {
    try {
      await activate.mutateAsync(versionId);
      toast.success(`Version ${version} is now active`);
    } catch (err) {
      toast.error('Restore failed', err instanceof ApiError ? err.message : 'Please try again.');
    }
  };

  if (isLoading || !versions) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <EmptyState icon={GitBranch} title="No versions yet" description="Prompt versions will appear here." />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-text-2">
        Every prompt change is a version. Roll back instantly if an edit misbehaves.
      </p>
      <ol className="relative flex flex-col">
        {versions.map((v, i) => (
          <li key={v.id} className="flex gap-4 pb-6 last:pb-0">
            <div className="flex flex-col items-center">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                  v.isActive ? 'bg-accent text-white' : 'bg-surface-2 text-text-2'
                }`}
              >
                <GitBranch className="size-4" />
              </span>
              {i < versions.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
            </div>
            <Card className="flex-1">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Version {v.version}</p>
                    {v.isActive && (
                      <Badge tone="accent" dot>
                        Active
                      </Badge>
                    )}
                  </div>
                  {v.changelog && <p className="mt-0.5 text-[13px] text-text-2">{v.changelog}</p>}
                  <p className="mt-0.5 text-[12px] text-text-3">{formatRelative(v.createdAt)}</p>
                </div>
                {!v.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={activate.isPending}
                    onClick={() => restore(v.id, v.version)}
                  >
                    Restore
                  </Button>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
