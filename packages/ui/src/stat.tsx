import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { cn } from './lib/cn';
import { Card } from './card';

export interface StatCardProps {
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  icon?: LucideIcon;
  chart?: ReactNode;
  className?: string;
}

/** KPI card with optional trend delta and sparkline slot. */
export function StatCard({ label, value, delta, deltaLabel, icon: Icon, chart, className }: StatCardProps) {
  const up = (delta ?? 0) >= 0;
  return (
    <Card className={cn('flex flex-col gap-3 p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-text-2">{label}</p>
        {Icon && <Icon className="size-4 text-text-3" aria-hidden />}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-text">{value}</p>
          {delta !== undefined && (
            <p
              className={cn(
                'mt-1 inline-flex items-center gap-0.5 text-xs font-medium',
                up ? 'text-success' : 'text-danger',
              )}
            >
              {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {Math.abs(delta)}%{deltaLabel && <span className="ml-1 font-normal text-text-3">{deltaLabel}</span>}
            </p>
          )}
        </div>
        {chart && <div className="h-10 w-24 shrink-0 text-accent">{chart}</div>}
      </div>
    </Card>
  );
}
