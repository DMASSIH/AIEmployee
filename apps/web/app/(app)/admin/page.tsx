'use client';

import { Card, CardContent, StatCard } from '@aie/ui';
import { Activity, Cpu, Database, Server } from 'lucide-react';
import { services } from '@/lib/mock/admin';

const label = { operational: 'Operational', degraded: 'Degraded', down: 'Down' };

export default function AdminHealthPage() {
  const allGood = services.every((s) => s.status === 'operational');

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Overall status" value={allGood ? 'Healthy' : 'Degraded'} icon={Activity} />
        <StatCard label="API latency" value="42ms" delta={-4} icon={Server} />
        <StatCard label="DB connections" value="18 / 100" icon={Database} />
        <StatCard label="Worker load" value="61%" delta={7} icon={Cpu} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {services.map((s) => (
              <div key={s.name} className="flex items-center gap-4 px-5 py-3.5">
                <span
                  className={`size-2.5 rounded-full ${s.status === 'operational' ? 'bg-success' : s.status === 'degraded' ? 'bg-warning' : 'bg-danger'}`}
                  aria-hidden
                />
                <p className="flex-1 text-sm font-medium">{s.name}</p>
                <span className="hidden text-[13px] tabular-nums text-text-3 sm:block">{s.latencyMs}ms</span>
                <span className="hidden text-[13px] tabular-nums text-text-3 sm:block">{s.uptime}</span>
                <span
                  className={`text-[13px] font-medium ${s.status === 'operational' ? 'text-success' : s.status === 'degraded' ? 'text-warning' : 'text-danger'}`}
                >
                  {label[s.status]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
