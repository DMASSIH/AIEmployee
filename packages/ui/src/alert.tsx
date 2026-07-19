import type { HTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from './lib/cn';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const tones: Record<Tone, { wrap: string; icon: typeof Info }> = {
  info: { wrap: 'border-info/25 bg-info-soft text-info', icon: Info },
  success: { wrap: 'border-success/25 bg-success-soft text-success', icon: CheckCircle2 },
  warning: { wrap: 'border-warning/25 bg-warning-soft text-warning', icon: AlertTriangle },
  danger: { wrap: 'border-danger/25 bg-danger-soft text-danger', icon: XCircle },
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  title: string;
  children?: ReactNode;
}

export function Alert({ tone = 'info', title, children, className, ...props }: AlertProps) {
  const { wrap, icon: Icon } = tones[tone];
  return (
    <div role="alert" className={cn('flex gap-3 rounded-md border p-3.5', wrap, className)} {...props}>
      <Icon className="mt-0.5 size-4.5 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {children && <div className="mt-1 text-[13px] leading-relaxed opacity-90">{children}</div>}
      </div>
    </div>
  );
}
