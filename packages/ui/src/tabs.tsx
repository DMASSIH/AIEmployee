'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { Slot } from '@radix-ui/react-slot';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from './lib/cn';

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export function TabsList({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex h-9 items-center gap-1 rounded-md bg-surface-2 p-1 text-text-2',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-sm px-3 text-[13px] font-medium outline-none',
        'transition-colors focus-visible:ring-2 focus-visible:ring-accent/30',
        'data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-card',
        'hover:text-text',
        className,
      )}
      {...props}
    />
  );
}

/** Underline-style tab bar for page-level navigation (employee detail, settings). */
export function TabNav({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn('flex items-center gap-1 overflow-x-auto border-b border-border', className)}
      {...props}
    />
  );
}

export function TabNavItem({
  active,
  asChild,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      role="tab"
      aria-selected={active}
      className={cn(
        '-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-accent/30',
        active
          ? 'border-accent text-text'
          : 'border-transparent text-text-2 hover:border-border-strong hover:text-text',
        className,
      )}
      {...props}
    />
  );
}
