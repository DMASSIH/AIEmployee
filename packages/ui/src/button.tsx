import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import { cn } from './lib/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-white shadow-card hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/40',
  secondary:
    'bg-surface-2 text-text hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-accent/30',
  outline:
    'bg-surface text-text border border-border shadow-card hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent/30',
  ghost: 'bg-transparent text-text-2 hover:bg-surface-2 hover:text-text',
  danger:
    'bg-danger text-white shadow-card hover:opacity-90 focus-visible:ring-2 focus-visible:ring-danger/40',
  link: 'bg-transparent text-accent underline-offset-4 hover:underline px-0',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] rounded-sm gap-1.5',
  md: 'h-9 px-3.5 text-sm rounded-md gap-2',
  lg: 'h-11 px-5 text-[15px] rounded-md gap-2',
  icon: 'h-9 w-9 rounded-md',
  'icon-sm': 'h-8 w-8 rounded-sm',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Render as the child element (e.g. a Next.js <Link>) instead of a <button>. */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, asChild = false, className, children, disabled, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      disabled={asChild ? undefined : (disabled ?? loading)}
      className={cn(
        'inline-flex select-none items-center justify-center font-medium outline-none',
        'transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
});
