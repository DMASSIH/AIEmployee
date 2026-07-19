'use client';

import { Card, CardContent, CardHeader, CardTitle, LineChart, StatCard } from '@aie/ui';
import { Activity, Gauge, TrendingUp, Zap } from 'lucide-react';
import { costSeries, latencySeries, messagesSeries } from '@/lib/mock/analytics';

export default function AdminMonitoringPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Requests / min" value="1,284" delta={6} icon={Activity} />
        <StatCard label="p95 latency" value="240ms" delta={-3} icon={Zap} />
        <StatCard label="Error rate" value="0.12%" delta={-8} icon={Gauge} />
        <StatCard label="Throughput" value="98.2%" delta={1} icon={TrendingUp} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Request volume</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={messagesSeries} formatValue={(v) => `${v} req`} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latency (p95, ms)</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={latencySeries} formatValue={(v) => `${v} ms`} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Inference cost ($/day)</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={costSeries} formatValue={(v) => `$${v.toFixed(2)}`} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
