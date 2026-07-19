import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './lib/cn';

export interface TimelineItemProps {
  icon?: LucideIcon;
  title: ReactNode;
  meta?: string;
  children?: ReactNode;
  last?: boolean;
  tone?: 'default' | 'accent' | 'success' | 'danger';
}

const dotTones = {
  default: 'bg-surface-3 text-text-2',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
};

/** Vertical timeline / activity feed item. Compose inside a plain <ol>. */
export function TimelineItem({
  icon: Icon,
  title,
  meta,
  children,
  last,
  tone = 'default',
}: TimelineItemProps) {
  return (
    <li className="relative flex gap-3.5 pb-6 last:pb-0">
      {!last && <span aria-hidden className="absolute left-[13px] top-8 h-[calc(100%-2rem)] w-px bg-border" />}
      <span
        className={cn(
          'z-10 flex size-7 shrink-0 items-center justify-center rounded-full',
          dotTones[tone],
        )}
      >
        {Icon ? <Icon className="size-3.5" aria-hidden /> : <span className="size-1.5 rounded-full bg-current" />}
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="text-sm text-text">{title}</p>
          {meta && <p className="shrink-0 text-xs text-text-3">{meta}</p>}
        </div>
        {children && <div className="mt-1.5 text-[13px] leading-relaxed text-text-2">{children}</div>}
      </div>
    </li>
  );
}
