'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, DollarSign, MessagesSquare, Timer, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DonutChart,
  LineChart,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatCard,
} from '@aie/ui';
import { PageHeader } from '@/components/shell/page-header';
import {
  costSeries,
  errorSeries,
  kpis,
  latencySeries,
  messagesSeries,
  successSeries,
  usageByChannel,
  usageByEmployee,
} from '@/lib/mock/analytics';
import { formatCurrency, formatNumber } from '@/lib/format';

export default function AnalyticsPage() {
  const [range, setRange] = useState('30d');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        description="How your AI team performs across volume, quality, latency, and cost."
        actions={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total messages" value={formatNumber(4820)} delta={14} icon={MessagesSquare} />
        <StatCard label="Success rate" value={`${kpis.successRate}%`} delta={1.4} icon={CheckCircle2} />
        <StatCard label="Avg latency" value={`${(kpis.avgLatencyMs / 1000).toFixed(2)}s`} delta={-3.1} icon={Timer} />
        <StatCard label="Total spend" value={formatCurrency(kpis.costMtd)} delta={8} icon={DollarSign} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Messages" icon={MessagesSquare}>
          <LineChart data={messagesSeries} formatValue={(v) => `${v} messages`} />
        </ChartCard>
        <ChartCard title="Success rate (%)" icon={TrendingUp}>
          <LineChart data={successSeries} formatValue={(v) => `${v}%`} />
        </ChartCard>
        <ChartCard title="Avg latency (ms)" icon={Timer}>
          <LineChart data={latencySeries} formatValue={(v) => `${v} ms`} />
        </ChartCard>
        <ChartCard title="Cost ($)" icon={DollarSign}>
          <BarChart data={costSeries} formatValue={(v) => `$${v.toFixed(2)}`} />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>By employee</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={usageByEmployee} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By channel</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={usageByChannel} />
          </CardContent>
        </Card>
        <ChartCard title="Errors" icon={AlertTriangle}>
          <BarChart data={errorSeries} height={180} formatValue={(v) => `${v} errors`} />
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof MessagesSquare;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Icon className="size-4 text-text-3" />
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
