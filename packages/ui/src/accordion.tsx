'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { ChevronDown } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from './lib/cn';

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      className={cn('border-b border-border last:border-0', className)}
      {...props}
    />
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          'flex flex-1 items-center justify-between gap-4 py-4 text-left text-[15px] font-medium text-text',
          'outline-none transition-colors hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/30',
          '[&[data-state=open]>svg]:rotate-180',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown className="size-4 shrink-0 text-text-3 transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden data-[state=open]:animate-fade-in"
      {...props}
    >
      <div className={cn('pb-4 text-sm leading-relaxed text-text-2', className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}

export function Progress({
  value,
  max = 100,
  className,
  tone = 'accent',
}: {
  value: number;
  max?: number;
  className?: string;
  tone?: 'accent' | 'success' | 'warning' | 'danger';
}) {
  const tones = {
    accent: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  };
  return (
    <ProgressPrimitive.Root
      value={value}
      max={max}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-3', className)}
    >
      <ProgressPrimitive.Indicator
        className={cn('h-full rounded-full transition-all duration-300', tones[tone])}
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
    </ProgressPrimitive.Root>
  );
}
