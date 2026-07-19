import type { Metadata } from 'next';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Badge } from '@aie/ui';
import { BigCta, PageIntro, Section } from '@/components/marketing/sections';
import { plans } from '@/lib/mock/billing';

export const metadata: Metadata = { title: 'Pricing' };

const faqs = [
  { q: 'What counts as a task?', a: 'One completed unit of work: a resolved conversation turn, a drafted email, or a booked meeting. Retrieval and internal steps are never billed separately.' },
  { q: 'Can I change plans later?', a: 'Yes — upgrades apply immediately with prorated billing, downgrades at the end of the current period. Your entitlements are snapshotted, so repricing never silently changes an existing subscription.' },
  { q: 'What happens when I hit my task limit?', a: 'Employees pause gracefully and drafts queue up. We never hard-drop customer conversations mid-thread, and you can raise the limit at any time.' },
  { q: 'Is there a free trial?', a: 'Every workspace starts with a 14-day trial including 100 tasks and one employee. No credit card required.' },
  { q: 'Do you offer annual billing?', a: 'Yes — annual billing saves 10% on every plan and is available at checkout.' },
];

export default function PricingPage() {
  return (
    <>
      <PageIntro
        eyebrow="Pricing"
        title="Pay a fraction of a salary"
        lead="Simple plans that scale with the work your AI team actually does. Start free, upgrade when they earn it."
      />

      <Section className="pt-0">
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-lg border bg-surface p-7 shadow-card ${
                plan.highlight ? 'border-accent ring-2 ring-accent/20' : 'border-border'
              }`}
            >
              {plan.highlight && (
                <Badge tone="accent" className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most popular
                </Badge>
              )}
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="mt-1 text-sm text-text-2">{plan.description}</p>
              <p className="mt-5">
                <span className="text-4xl font-semibold tracking-tight">${plan.monthly}</span>
                <span className="text-sm text-text-3"> / month</span>
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-text-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`mt-7 inline-flex h-10 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                  plan.highlight
                    ? 'bg-accent text-white shadow-card hover:bg-accent-hover'
                    : 'border border-border bg-surface shadow-card hover:bg-surface-2'
                }`}
              >
                Start free trial
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-text-2">
          Need more than 10 employees?{' '}
          <Link href="/enterprise" className="font-medium text-accent hover:underline">
            Talk to us about Enterprise →
          </Link>
        </p>
      </Section>

      <Section title="Frequently asked questions" className="max-w-3xl">
        <Accordion type="single" collapsible className="rounded-lg border border-border bg-surface px-6 shadow-card">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Section>

      <BigCta />
    </>
  );
}
