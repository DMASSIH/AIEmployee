import type { HTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './lib/cn';

export function Spinner({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="status" aria-label="Loading" className={cn('text-text-3', className)} {...props}>
      <Loader2 className="size-5 animate-spin" aria-hidden />
    </div>
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-md bg-surface-2', className)}
      {...props}
    />
  );
}

/** Full-page centered loading state (route-level). */
export function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-64 flex-1 flex-col items-center justify-center gap-3 py-24">
      <Spinner />
      <p className="text-sm text-text-3">{label}…</p>
    </div>
  );
}
