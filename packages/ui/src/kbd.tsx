import type { HTMLAttributes } from 'react';
import { cn } from './lib/cn';

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded-sm',
        'border border-border bg-surface-2 px-1 font-sans text-[11px] font-medium text-text-3',
        className,
      )}
      {...props}
    />
  );
}

export function Separator({
  className,
  vertical,
  ...props
}: HTMLAttributes<HTMLDivElement> & { vertical?: boolean }) {
  return (
    <div
      role="separator"
      className={cn(vertical ? 'w-px self-stretch bg-border' : 'h-px w-full bg-border', className)}
      {...props}
    />
  );
}
