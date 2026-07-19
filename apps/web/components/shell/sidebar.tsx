'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { cn } from '@aie/ui';
import { mainNav, workspaceNav, type NavItem } from '@/lib/nav';
import { OrgSwitcher } from './org-switcher';

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
        active ? 'bg-accent-soft text-accent' : 'text-text-2 hover:bg-surface-2 hover:text-text',
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {item.label}
    </Link>
  );
}

/** App sidebar — rendered statically on desktop and inside the drawer on mobile. */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Link href="/dashboard" className="flex items-center gap-2 px-1 font-semibold tracking-tight" onClick={onNavigate}>
        <span className="flex size-7 items-center justify-center rounded-md bg-accent text-white">
          <Sparkles className="size-4" aria-hidden />
        </span>
        AI Employee
      </Link>
      <OrgSwitcher />
      <nav aria-label="Primary" className="flex flex-col gap-0.5">
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
      <p className="mt-2 px-2.5 text-[11px] font-medium uppercase tracking-wider text-text-3">
        Workspace
      </p>
      <nav aria-label="Workspace" className="-mt-2 flex flex-col gap-0.5">
        {workspaceNav.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="mt-auto rounded-md border border-border bg-surface-2/60 p-3">
        <p className="text-[13px] font-medium">Usage this month</p>
        <p className="mt-0.5 text-[12px] text-text-3">2,180 / 3,000 tasks</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full w-[73%] rounded-full bg-accent" />
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:block">
      <SidebarContent />
    </aside>
  );
}
