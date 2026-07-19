'use client';

import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from './lib/cn';

/* ----------------------------- Dropdown menu ------------------------------ */

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={6}
        collisionPadding={8}
        className={cn(
          'z-50 min-w-44 rounded-md border border-border bg-surface p-1 shadow-pop animate-scale-in',
          className,
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> & { destructive?: boolean }) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        'flex cursor-default select-none items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm outline-none',
        'data-[highlighted]:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        destructive ? 'text-danger data-[highlighted]:bg-danger-soft' : 'text-text',
        '[&>svg]:size-4 [&>svg]:text-text-3',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownPrimitive.Label>) {
  return (
    <DropdownPrimitive.Label
      className={cn('px-2.5 py-1.5 text-xs font-medium text-text-3', className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator(
  props: ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>,
) {
  return <DropdownPrimitive.Separator className="-mx-1 my-1 h-px bg-border" {...props} />;
}

/* -------------------------------- Popover --------------------------------- */

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={6}
        collisionPadding={8}
        className={cn(
          'z-50 rounded-md border border-border bg-surface p-4 shadow-pop outline-none animate-scale-in',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

/* -------------------------------- Tooltip --------------------------------- */

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({
  content,
  side = 'top',
  children,
}: {
  content: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}) {
  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-50 rounded-sm bg-ink px-2.5 py-1.5 text-xs font-medium text-ink-text shadow-pop animate-fade-in"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
