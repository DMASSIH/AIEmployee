'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Bot,
  Building2,
  CreditCard,
  LayoutDashboard,
  Moon,
  MessagesSquare,
  Plus,
  Settings,
  ShieldHalf,
  Sun,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@aie/ui';

export interface PaletteState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
}

/** ⌘K / Ctrl+K global command palette state. */
export function useCommandPalette(): PaletteState {
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return {
    isOpen,
    open: () => setOpen(true),
    close: () => setOpen(false),
    setOpen,
  };
}

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'AI Employees', href: '/employees', icon: Bot },
  { label: 'Conversations', href: '/conversations', icon: MessagesSquare },
  { label: 'Knowledge', href: '/knowledge', icon: BookOpen },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Organizations', href: '/organizations', icon: Building2 },
  { label: 'Billing', href: '/billing', icon: CreditCard },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Admin', href: '/admin', icon: ShieldHalf },
];

const actions = [
  { label: 'Hire a new AI employee', href: '/employees/new', icon: Plus },
  { label: 'Upload knowledge', href: '/knowledge', icon: BookOpen },
];

export function CommandPalette({ state }: { state: PaletteState }) {
  const router = useRouter();
  const { setTheme } = useTheme();

  const run = useCallback(
    (fn: () => void) => {
      state.close();
      fn();
    },
    [state],
  );

  return (
    <CommandDialog open={state.isOpen} onOpenChange={state.setOpen}>
      <CommandInput placeholder="Search or jump to…" />
      <CommandList>
        <CommandEmpty className="py-8 text-center text-sm text-text-3">No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {navItems.map((item) => (
            <CommandItem key={item.href} value={item.label} onSelect={() => run(() => router.push(item.href))}>
              <item.icon />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Actions">
          {actions.map((item) => (
            <CommandItem key={item.label} value={item.label} onSelect={() => run(() => router.push(item.href))}>
              <item.icon />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Theme">
          <CommandItem value="Light theme" onSelect={() => run(() => setTheme('light'))}>
            <Sun /> Light theme
          </CommandItem>
          <CommandItem value="Dark theme" onSelect={() => run(() => setTheme('dark'))}>
            <Moon /> Dark theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
