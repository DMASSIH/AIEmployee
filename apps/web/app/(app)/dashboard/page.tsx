'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CreditCard,
  Gauge,
  MessagesSquare,
  Plus,
  Timer,
} from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LineChart,
  Progress,
  Sparkline,
  StatCard,
  TimelineItem,
} from '@aie/ui';
import { PageHeader } from '@/components/shell/page-header';
import { useAuth } from '@/providers/auth-provider';
import { useEmployees } from '@/hooks/use-employees';
import { conversationsSeries, kpis, messagesSeries } from '@/lib/mock/analytics';
import { recentActivity } from '@/lib/mock/activity';
import { formatCompact, formatCurrency, formatNumber, formatRelative } from '@/lib/format';

const statusTone = {
  active: 'success',
  onboarding: 'warning',
  paused: 'neutral',
  archived: 'neutral',
} as const;

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(' ')[0] ?? 'there';
  const { data: team } = useEmployees({ pageSize: 5 });
  const teamMembers = team?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Good to see you, ${firstName}`}
        description="Here's how your AI team is performing this month."
        actions={
          <Button asChild>
            <Link href="/employees/new">
              <Plus className="size-4" /> Hire employee
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tasks this month"
          value={formatNumber(kpis.tasksMtd)}
          delta={12}
          deltaLabel="vs last month"
          icon={MessagesSquare}
          chart={<Sparkline data={messagesSeries.map((p) => p.value)} />}
        />
        <StatCard label="Success rate" value={`${kpis.successRate}%`} delta={1.4} icon={CheckCircle2} />
        <StatCard label="Avg latency" value={`${(kpis.avgLatencyMs / 1000).toFixed(2)}s`} delta={-3.1} icon={Timer} />
        <StatCard label="Spend (MTD)" value={formatCurrency(kpis.costMtd)} delta={8} icon={CreditCard} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Conversations</CardTitle>
            <Badge tone="neutral">Last 30 days</Badge>
          </CardHeader>
          <CardContent>
            <LineChart data={conversationsSeries} formatValue={(v) => `${v} conversations`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan usage</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <UsageRow label="Tasks" used={kpis.tasksMtd} limit={kpis.tasksLimit} format={formatNumber} />
            <UsageRow
              label="Knowledge"
              used={kpis.knowledgeBytes}
              limit={kpis.knowledgeLimit}
              format={(v) => `${formatCompact(Math.round(v / 1024 / 1024))} MB`}
            />
            <UsageRow label="AI employees" used={kpis.activeEmployees} limit={3} format={formatNumber} />
            <Link
              href="/billing"
              className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
            >
              Manage plan <ArrowRight className="size-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Your team</CardTitle>
            <Link href="/employees" className="text-[13px] font-medium text-accent hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {teamMembers.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-8 text-center">
                <Bot className="size-6 text-text-3" />
                <p className="text-sm text-text-2">No employees yet.</p>
                <Link href="/employees/new" className="text-[13px] font-medium text-accent hover:underline">
                  Hire your first
                </Link>
              </div>
            ) : (
              teamMembers.map((e) => (
                <Link
                  key={e.id}
                  href={`/employees/${e.id}`}
                  className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-surface-2"
                >
                  <Avatar name={e.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.name}</p>
                    <p className="truncate text-[13px] text-text-3">{e.roleTitle}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-medium">{e.model}</p>
                    <p className="text-[11px] text-text-3 capitalize">{e.visibility}</p>
                  </div>
                  <Badge tone={statusTone[e.status]} dot className="capitalize">
                    {e.status}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Gauge className="size-4 text-text-3" />
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ol>
              {recentActivity.map((a, i) => (
                <TimelineItem
                  key={a.id}
                  tone={a.tone}
                  title={
                    <span>
                      <span className="font-medium text-text">{a.actor}</span> {a.action}
                    </span>
                  }
                  meta={formatRelative(a.at)}
                  last={i === recentActivity.length - 1}
                >
                  {a.detail}
                </TimelineItem>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent">
              <Bot className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium">Train your team on new knowledge</p>
              <p className="text-[13px] text-text-2">Upload docs so your employees answer with your latest policies.</p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/knowledge">
              Add knowledge <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function UsageRow({
  label,
  used,
  limit,
  format,
}: {
  label: string;
  used: number;
  limit: number;
  format: (v: number) => string;
}) {
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="text-text-2">{label}</span>
        <span className="tabular-nums text-text-3">
          {format(used)} / {format(limit)}
        </span>
      </div>
      <Progress value={pct} tone={pct > 90 ? 'danger' : pct > 75 ? 'warning' : 'accent'} />
    </div>
  );
}
