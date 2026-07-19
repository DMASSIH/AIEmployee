'use client';

import { useParams } from 'next/navigation';
import { BookOpen, CheckCircle2, DollarSign, GitBranch, MessagesSquare, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, LineChart, StatCard } from '@aie/ui';
import { employeeById } from '@/lib/mock/employees';
import { conversationsSeries } from '@/lib/mock/analytics';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';

export default function EmployeeOverview() {
  const { id } = useParams<{ id: string }>();
  const e = employeeById(id);
  if (!e) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Conversations (30d)" value={formatNumber(e.conversations30d)} delta={9} icon={MessagesSquare} />
        <StatCard label="Success rate" value={`${e.successRate}%`} delta={1.2} icon={CheckCircle2} />
        <StatCard label="Avg latency" value={`${(e.avgLatencyMs / 1000).toFixed(2)}s`} delta={-2.4} icon={Timer} />
        <StatCard label="Cost (MTD)" value={formatCurrency(e.costMtd)} delta={6} icon={DollarSign} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={conversationsSeries} formatValue={(v) => `${v} conversations`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {[
              { icon: GitBranch, label: 'Prompt version', value: `v${e.promptVersion}` },
              { icon: BookOpen, label: 'Knowledge sources', value: String(e.knowledgeSources) },
              { icon: MessagesSquare, label: 'Channels', value: e.channels.join(', ') },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-text-2">
                  <row.icon className="size-4 text-text-3" /> {row.label}
                </span>
                <span className="font-medium">{row.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-text-2">Hired</span>
              <span className="font-medium">{formatDate(e.createdAt)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-text-2">{e.jobDescription}</p>
        </CardContent>
      </Card>
    </div>
  );
}
