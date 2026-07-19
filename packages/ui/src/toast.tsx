'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { cn } from './lib/cn';

type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

/** Tiny event-based store — no context needed, callable from anywhere. */
let nextId = 1;
let listeners: ((toasts: ToastItem[]) => void)[] = [];
let toasts: ToastItem[] = [];

function emit() {
  for (const l of listeners) l([...toasts]);
}

function push(tone: ToastTone, title: string, description?: string) {
  const id = nextId++;
  toasts = [...toasts, { id, tone, title, description }];
  emit();
  setTimeout(() => dismiss(id), 4500);
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (title: string, description?: string) => push('success', title, description),
  error: (title: string, description?: string) => push('error', title, description),
  info: (title: string, description?: string) => push('info', title, description),
  warning: (title: string, description?: string) => push('warning', title, description),
};

const icons: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const iconTones: Record<ToastTone, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-info',
  warning: 'text-warning',
};

/** Mount once (in the root providers). Renders the stacked toast viewport. */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    listeners.push(setItems);
    return () => {
      listeners = listeners.filter((l) => l !== setItems);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
    >
      {items.map((t) => {
        const Icon = icons[t.tone];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-md border border-border bg-surface p-3.5',
              'shadow-pop animate-slide-up',
            )}
          >
            <Icon className={cn('mt-0.5 size-4.5 shrink-0', iconTones[t.tone])} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[13px] text-text-2">{t.description}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="rounded-sm p-0.5 text-text-3 transition-colors hover:text-text"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
