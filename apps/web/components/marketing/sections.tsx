import Link from 'next/link';
import type { ReactNode } from 'react';
import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '@aie/ui';

/* Shared building blocks for every marketing page. */

export function PageIntro({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  children?: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-3xl px-6 pb-16 pt-20 text-center sm:pt-28">
      <p className="text-sm font-semibold text-accent">{eyebrow}</p>
      <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-text-2">{lead}</p>
      {children}
    </section>
  );
}

export function Section({
  title,
  lead,
  children,
  className,
}: {
  title?: string;
  lead?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('mx-auto max-w-6xl px-6 py-16 sm:py-20', className)}>
      {title && (
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight">{title}</h2>
          {lead && <p className="mt-4 text-pretty text-[17px] leading-relaxed text-text-2">{lead}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function FeatureGrid({
  items,
}: {
  items: { icon: LucideIcon; title: string; description: string }[];
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ icon: Icon, title, description }) => (
        <div
          key={title}
          className="group rounded-lg border border-border bg-surface p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop"
        >
          <div className="mb-4 flex size-10 items-center justify-center rounded-md bg-accent-soft text-accent">
            <Icon className="size-5" aria-hidden />
          </div>
          <h3 className="text-[15px] font-semibold">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-text-2">{description}</p>
        </div>
      ))}
    </div>
  );
}

export function CheckList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn('flex flex-col gap-2.5', className)}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-text-2">
          <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function LogoCloud() {
  const logos = ['Nordic Supply', 'Atlas Logistics', 'Bright & Co', 'Fjord Studio', 'Meridian', 'Kollektiv'];
  return (
    <div className="border-y border-border bg-surface/60">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-center text-[13px] font-medium uppercase tracking-wider text-text-3">
          Trusted by teams that never sleep
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {logos.map((l) => (
            <span key={l} className="text-[15px] font-semibold tracking-tight text-text-3">
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BigCta({
  title = 'Hire your first AI employee today',
  lead = 'Set up in minutes. Train it on your knowledge. Watch it work.',
}: {
  title?: string;
  lead?: string;
}) {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      <div className="relative overflow-hidden rounded-lg bg-ink px-8 py-16 text-center shadow-modal">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_200px_at_50%_-40px,rgb(99_102_241/0.35),transparent)]"
        />
        <h2 className="relative text-balance text-3xl font-semibold tracking-tight text-ink-text">
          {title}
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-pretty text-[17px] text-ink-text/70">{lead}</p>
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex h-11 items-center rounded-md bg-accent px-6 text-[15px] font-medium text-white shadow-card transition-colors hover:bg-accent-hover"
          >
            Get started free
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-11 items-center rounded-md border border-white/15 px-6 text-[15px] font-medium text-ink-text transition-colors hover:bg-white/10"
          >
            Talk to sales
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Testimonials() {
  const quotes = [
    {
      quote:
        'Maya resolves 70% of our support inbox before anyone on the team even opens it. It genuinely feels like we hired someone.',
      name: 'Sofia Lindqvist',
      role: 'Head of CX, Nordic Supply',
    },
    {
      quote:
        'The approval mode was the unlock. Our AI drafts everything, we click approve, and response times dropped from hours to minutes.',
      name: 'Marcus Weber',
      role: 'COO, Atlas Logistics',
    },
    {
      quote:
        'We evaluated four platforms. This was the only one where tenant isolation was enforced in the database, not just promised in a slide.',
      name: 'Priya Raman',
      role: 'CTO, Meridian',
    },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {quotes.map((q) => (
        <figure key={q.name} className="flex flex-col justify-between rounded-lg border border-border bg-surface p-6 shadow-card">
          <blockquote className="text-[15px] leading-relaxed text-text">“{q.quote}”</blockquote>
          <figcaption className="mt-5 text-sm">
            <span className="font-medium text-text">{q.name}</span>
            <span className="text-text-3"> — {q.role}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
