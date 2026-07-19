'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as RadioPrimitive from '@radix-ui/react-radio-group';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { Check, Minus } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from './lib/cn';

export function Checkbox({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'flex size-4.5 shrink-0 items-center justify-center rounded-sm border border-border-strong bg-surface',
        'shadow-card outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/30',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-white',
        'data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent data-[state=indeterminate]:text-white',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        {props.checked === 'indeterminate' ? <Minus className="size-3" /> : <Check className="size-3" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export const RadioGroup = RadioPrimitive.Root;

export function RadioItem({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadioPrimitive.Item>) {
  return (
    <RadioPrimitive.Item
      className={cn(
        'flex size-4.5 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface',
        'shadow-card outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/30',
        'data-[state=checked]:border-accent disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="size-2.5 rounded-full bg-accent" />
    </RadioPrimitive.Item>
  );
}

export function Switch({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'inline-flex h-5.5 w-9.5 shrink-0 items-center rounded-full border border-transparent bg-surface-3 p-0.5',
        'outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/30',
        'data-[state=checked]:bg-accent disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'block size-4.5 rounded-full bg-white shadow-card transition-transform',
          'data-[state=checked]:translate-x-4',
        )}
      />
    </SwitchPrimitive.Root>
  );
}
