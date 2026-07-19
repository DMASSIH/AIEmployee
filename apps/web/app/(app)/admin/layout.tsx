'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ShieldHalf } from 'lucide-react';
import { Alert, cn } from '@aie/ui';
import { PageHeader } from '@/components/shell/page-header';
import { adminNav } from '@/lib/nav';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Admin"
        description="Platform operations and internal tooling."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">
            <ShieldHalf className="size-3.5" /> Staff only
          </span>
        }
      />
      <Alert tone="info" title="Internal preview">
        These are platform-admin interfaces shown with representative data. They connect to real
        infrastructure in a later milestone.
      </Alert>
      <div className="grid gap-8 lg:grid-cols-[190px_1fr]">
        <nav aria-label="Admin" className="flex flex-col gap-0.5 lg:sticky lg:top-20 lg:self-start">
          {adminNav.map((item) => {
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
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
