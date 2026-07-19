'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, Sparkles, X } from 'lucide-react';
import { cn } from '@aie/ui';

const links = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/enterprise', label: 'Enterprise' },
  { href: '/customers', label: 'Customers' },
  { href: '/docs', label: 'Docs' },
  { href: '/blog', label: 'Blog' },
];

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2 font-semibold tracking-tight', className)}>
      <span className="flex size-7 items-center justify-center rounded-md bg-accent text-white">
        <Sparkles className="size-4" aria-hidden />
      </span>
      AI Employee
    </Link>
  );
}

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-text-2 transition-colors hover:text-text"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center rounded-md bg-accent px-3.5 text-sm font-medium text-white shadow-card transition-colors hover:bg-accent-hover"
          >
            Get started
          </Link>
        </div>
        <button
          className="rounded-md p-2 text-text-2 transition-colors hover:bg-surface-2 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <nav aria-label="Mobile" className="border-t border-border bg-surface px-6 py-4 md:hidden">
          <ul className="flex flex-col gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-2.5 text-[15px] font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="mt-3 flex gap-3">
              <Link
                href="/login"
                className="flex h-10 flex-1 items-center justify-center rounded-md border border-border text-sm font-medium"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="flex h-10 flex-1 items-center justify-center rounded-md bg-accent text-sm font-medium text-white"
              >
                Get started
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
