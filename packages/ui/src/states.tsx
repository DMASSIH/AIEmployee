import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, type LucideIcon } from 'lucide-react';
import { cn } from './lib/cn';
import { Button } from './button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void };
  children?: ReactNode;
  className?: string;
}

/** Consistent empty state used across every list/table when there is no data. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border',
        'bg-surface px-6 py-16 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="mb-2 flex size-11 items-center justify-center rounded-md bg-surface-2 text-text-3">
          <Icon className="size-5" aria-hidden />
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-text">{title}</h3>
      {description && <p className="max-w-sm text-sm text-text-2">{description}</p>}
      {action && (
        <Button className="mt-3" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'The request could not be completed. Please try again.',
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-danger/20',
        'bg-danger-soft/40 px-6 py-14 text-center',
        className,
      )}
    >
      <AlertTriangle className="mb-1 size-6 text-danger" aria-hidden />
      <h3 className="text-[15px] font-semibold text-text">{title}</h3>
      <p className="max-w-sm text-sm text-text-2">{description}</p>
      {onRetry && (
        <Button variant="outline" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function SuccessState({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-success/20',
        'bg-success-soft/40 px-6 py-14 text-center',
        className,
      )}
    >
      <CheckCircle2 className="mb-1 size-6 text-success" aria-hidden />
      <h3 className="text-[15px] font-semibold text-text">{title}</h3>
      {description && <p className="max-w-sm text-sm text-text-2">{description}</p>}
      {children}
    </div>
  );
}
