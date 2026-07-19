'use client';

import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from './lib/cn';
import { Dialog, DialogContent } from './dialog';

export const Command = CommandPrimitive;
export const CommandEmpty = CommandPrimitive.Empty;

export function CommandDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] max-w-xl translate-y-0 overflow-hidden p-0 [&>button]:hidden">
        <CommandPrimitive label="Command palette" loop>
          {children}
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}

export function CommandInput({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof CommandPrimitive.Input>) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border px-4">
      <Search className="size-4 shrink-0 text-text-3" aria-hidden />
      <CommandPrimitive.Input
        className={cn(
          'h-12 w-full bg-transparent text-sm text-text outline-none placeholder:text-text-3',
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function CommandList({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      className={cn('max-h-80 overflow-y-auto p-2', className)}
      {...props}
    />
  );
}

export function CommandGroup({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      className={cn(
        'mb-1 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5',
        '[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-text-3',
        className,
      )}
      {...props}
    />
  );
}

export function CommandItem({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={cn(
        'flex cursor-default select-none items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-text',
        'outline-none data-[selected=true]:bg-surface-2 [&>svg]:size-4 [&>svg]:text-text-3',
        className,
      )}
      {...props}
    />
  );
}
