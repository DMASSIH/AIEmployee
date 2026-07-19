'use client';

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from './lib/cn';

const sizes = { sm: 'size-6 text-[10px]', md: 'size-8 text-xs', lg: 'size-10 text-sm', xl: 'size-14 text-base' };

/** Deterministic soft background per name — used when there is no image. */
const palette = [
  'bg-accent-soft text-accent',
  'bg-success-soft text-success',
  'bg-warning-soft text-warning',
  'bg-info-soft text-info',
  'bg-danger-soft text-danger',
];

function toneFor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % palette.length;
  return palette[h]!;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export interface AvatarProps extends ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  name: string;
  src?: string;
  size?: keyof typeof sizes;
}

export function Avatar({ name, src, size = 'md', className, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full',
        sizes[size],
        className,
      )}
      {...props}
    >
      {src && <AvatarPrimitive.Image src={src} alt={name} className="size-full object-cover" />}
      <AvatarPrimitive.Fallback
        className={cn('flex size-full items-center justify-center font-semibold', toneFor(name))}
        delayMs={src ? 300 : 0}
      >
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export function AvatarStack({ names, max = 4 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((n) => (
        <Avatar key={n} name={n} size="sm" className="ring-2 ring-surface" />
      ))}
      {rest > 0 && (
        <span className="flex size-6 items-center justify-center rounded-full bg-surface-2 text-[10px] font-medium text-text-2 ring-2 ring-surface">
          +{rest}
        </span>
      )}
    </div>
  );
}
