import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'ghost' | 'danger';

const styles: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/40',
  ghost:
    'bg-transparent text-text border border-border hover:bg-surface-2',
  danger:
    'bg-transparent text-danger border border-danger/30 hover:bg-danger/5',
};

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium',
        'transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none',
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
