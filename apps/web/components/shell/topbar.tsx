'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Bell, LogOut, Menu, Monitor, Moon, Search, Settings, Sun, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Dialog,
  DialogContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Kbd,
  Popover,
  PopoverContent,
  PopoverTrigger,
  toast,
  type Crumb,
} from '@aie/ui';
import { useAuth } from '@/providers/auth-provider';
import { notifications } from '@/lib/mock/activity';
import { formatRelative } from '@/lib/format';
import { SidebarContent } from './sidebar';
import { CommandPalette, useCommandPalette } from './command-palette';

const labels: Record<string, string> = {
  dashboard: 'Dashboard', employees: 'AI Employees', new: 'New', conversations: 'Conversations',
  knowledge: 'Knowledge', analytics: 'Analytics', billing: 'Billing', organizations: 'Organizations',
  settings: 'Settings', admin: 'Admin', appearance: 'Appearance', preferences: 'Preferences',
  notifications: 'Notifications', security: 'Security', 'api-keys': 'API keys', members: 'Members',
  invitations: 'Invitations', roles: 'Roles & permissions', audit: 'Audit log', monitoring: 'Monitoring',
  logs: 'Logs', queues: 'Queues', workers: 'Workers', storage: 'Storage', users: 'Users', flags: 'Feature flags',
  organization: 'Organization',
};

function useCrumbs(): Crumb[] {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: Crumb[] = [];
  let href = '';
  for (const part of parts) {
    href += `/${part}`;
    crumbs.push({ label: labels[part] ?? decodeURIComponent(part), href });
  }
  return crumbs;
}

export function Topbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { setTheme } = useTheme();
  const crumbs = useCrumbs();
  const [mobileOpen, setMobileOpen] = useState(false);
  const palette = useCommandPalette();
  const unread = notifications.filter((n) => n.unread).length;

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur-md lg:px-6">
      {/* Mobile nav */}
      <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
        <Menu className="size-5" />
      </Button>
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="left-0 top-0 h-full w-72 max-w-[80vw] translate-x-0 translate-y-0 rounded-none border-r p-0 [&>button]:hidden">
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </DialogContent>
      </Dialog>

      <Breadcrumbs
        className="hidden sm:block"
        items={crumbs}
        renderLink={(href, children) => <Link href={href}>{children}</Link>}
      />

      <div className="ml-auto flex items-center gap-1.5">
        {/* Global search / command palette */}
        <button
          onClick={palette.open}
          className="hidden h-9 w-56 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-text-3 shadow-card transition-colors hover:border-border-strong md:flex"
        >
          <Search className="size-4" aria-hidden />
          <span className="flex-1 text-left">Search…</span>
          <Kbd>⌘K</Kbd>
        </button>
        <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Search" onClick={palette.open}>
          <Search className="size-4.5" />
        </Button>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Notifications (${unread} unread)`} className="relative">
              <Bell className="size-4.5" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex size-2 rounded-full bg-accent" aria-hidden />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <Badge tone="accent">{unread} new</Badge>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id} className="flex gap-3 border-b border-border px-4 py-3 last:border-0">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.unread ? 'bg-accent' : 'bg-surface-3'}`} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{n.title}</p>
                    <p className="mt-0.5 text-[13px] leading-snug text-text-2">{n.body}</p>
                    <p className="mt-1 text-[11px] text-text-3">{formatRelative(n.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent/30" aria-label="Account menu">
            <Avatar name={user?.displayName ?? user?.email ?? 'User'} size="md" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <span className="block text-sm font-medium text-text">{user?.displayName}</span>
              <span className="block truncate text-xs text-text-3">{user?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/settings')}>
              <User /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/settings/appearance')}>
              <Settings /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => setTheme('light')}>
              <Sun /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTheme('dark')}>
              <Moon /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTheme('system')}>
              <Monitor /> System
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              onSelect={() => {
                void logout().then(() => {
                  toast.info('Signed out');
                  router.replace('/login');
                });
              }}
            >
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandPalette state={palette} />
    </header>
  );
}
