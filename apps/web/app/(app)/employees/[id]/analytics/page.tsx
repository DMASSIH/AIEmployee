'use client';

import { Card, CardContent, CardHeader, CardTitle, DonutChart, LineChart } from '@aie/ui';
import { costSeries, latencySeries, messagesSeries, usageByChannel } from '@/lib/mock/analytics';

export default function EmployeeAnalytics() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart data={messagesSeries} formatValue={(v) => `${v} messages`} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Avg latency (ms)</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart data={latencySeries} formatValue={(v) => `${v} ms`} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cost ($)</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart data={costSeries} formatValue={(v) => `$${v.toFixed(2)}`} />
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
    </div>
  );
}
