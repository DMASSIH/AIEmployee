'use client';

import { Card, CardContent, CardHeader, CardTitle, Progress, StatCard } from '@aie/ui';
import { Boxes, Database, HardDrive } from 'lucide-react';
import { storageStats } from '@/lib/mock/admin';
import { formatBytes, formatNumber } from '@/lib/format';

export default function AdminStoragePage() {
  const pct = (storageStats.used / storageStats.quota) * 100;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Used" value={formatBytes(storageStats.used)} icon={HardDrive} />
        <StatCard label="Objects" value={formatNumber(storageStats.objects)} icon={Boxes} />
        <StatCard label="Buckets" value={String(storageStats.buckets)} icon={Database} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Capacity</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-2">{formatBytes(storageStats.used)} used</span>
            <span className="text-text-3">{formatBytes(storageStats.quota)} total</span>
          </div>
          <Progress value={pct} tone={pct > 90 ? 'danger' : 'accent'} />
          <p className="text-[13px] text-text-3">{pct.toFixed(1)}% of quota used across all tenants.</p>
        </CardContent>
      </Card>
    </div>
  );
}
