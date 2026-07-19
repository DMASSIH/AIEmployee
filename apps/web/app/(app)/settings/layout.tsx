'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@aie/ui';
import { PageHeader } from '@/components/shell/page-header';
import { settingsNav } from '@/lib/nav';

const groups = [
  { title: 'Account', items: settingsNav.slice(0, 6) },
  { title: 'Organization', items: settingsNav.slice(6) },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Manage your account and organization." />
      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Settings" className="flex flex-col gap-5 lg:sticky lg:top-20 lg:self-start">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-text-3">
                {group.title}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                        active ? 'bg-accent-soft text-accent' : 'text-text-2 hover:bg-surface-2 hover:text-text',
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
