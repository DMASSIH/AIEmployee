'use client';

import { useParams } from 'next/navigation';
import {
  BookOpen,
  GitBranch,
  Hash,
  MessageSquare,
  Sparkles,
  Thermometer,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@aie/ui';
import { autonomyLabel } from '@/components/employees/employee-bits';
import { useEmployee } from '@/hooks/use-employees';
import { formatDate } from '@/lib/format';

export default function EmployeeOverview() {
  const { id } = useParams<{ id: string }>();
  const { data: e, isLoading } = useEmployee(id);

  if (isLoading || !e) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-48 rounded-lg lg:col-span-2" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  const config = [
    { icon: Sparkles, label: 'Model', value: e.model },
    { icon: Thermometer, label: 'Temperature', value: e.temperature.toFixed(2) },
    { icon: Zap, label: 'Max tokens', value: String(e.maxTokens) },
    { icon: GitBranch, label: 'Autonomy', value: autonomyLabel[e.autonomy] },
  ];

  const details = [
    { icon: Hash, label: 'Slug', value: e.slug },
    { icon: GitBranch, label: 'Prompt version', value: e.promptVersion ? `v${e.promptVersion}` : '—' },
    { icon: BookOpen, label: 'Template', value: e.templateId ?? 'Custom' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {config.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-3 py-4">
              <span className="flex size-9 items-center justify-center rounded-md bg-surface-2 text-text-2">
                <c.icon className="size-4.5" />
              </span>
              <div>
                <p className="text-[12px] text-text-3">{c.label}</p>
                <p className="text-sm font-medium">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Job description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-2">{e.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {details.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-text-2">
                  <row.icon className="size-4 text-text-3" /> {row.label}
                </span>
                <span className="truncate font-medium">{row.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-text-2">Hired</span>
              <span className="font-medium">{formatDate(e.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-2">Updated</span>
              <span className="font-medium">{formatDate(e.updatedAt)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {e.welcomeMessage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-4 text-text-3" /> Welcome message
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-text-2">{e.welcomeMessage}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
