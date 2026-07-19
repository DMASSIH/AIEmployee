import type { Metadata } from 'next';
import { BigCta, LogoCloud, PageIntro, Section, Testimonials } from '@/components/marketing/sections';

export const metadata: Metadata = { title: 'Customers' };

const stories = [
  { company: 'Nordic Supply', industry: 'B2B Commerce', metric: '70%', metricLabel: 'of support resolved autonomously', story: 'A three-person CX team was drowning in order-status email. Maya now handles the routine 70% end-to-end, and the humans handle the conversations that actually need them.' },
  { company: 'Atlas Logistics', industry: 'Freight & Logistics', metric: '4 min', metricLabel: 'median response time (was 3.5 hours)', story: 'Approve-first mode let Atlas move fast without risk: their AI drafts every reply with carrier data attached, and dispatchers click approve from a queue.' },
  { company: 'Fjord Studio', industry: 'Design Agency', metric: '12 hrs', metricLabel: 'saved per week on operations', story: 'Sana chases invoices, confirms bookings, and compiles the Monday digest — the founder got her evenings back without hiring an operations manager.' },
];

export default function CustomersPage() {
  return (
    <>
      <PageIntro
        eyebrow="Customers"
        title="Teams that hired their way out of the backlog"
        lead="Real companies running AI employees in production — with the numbers to show for it."
      />
      <LogoCloud />
      <Section>
        <div className="flex flex-col gap-6">
          {stories.map((s) => (
            <article key={s.company} className="grid gap-8 rounded-lg border border-border bg-surface p-8 shadow-card lg:grid-cols-[1fr_260px]">
              <div>
                <p className="text-[13px] font-medium text-accent">{s.industry}</p>
                <h2 className="mt-1 text-xl font-semibold">{s.company}</h2>
                <p className="mt-3 leading-relaxed text-text-2">{s.story}</p>
              </div>
              <div className="flex flex-col justify-center rounded-md bg-surface-2 p-6 text-center">
                <p className="text-4xl font-semibold tracking-tight text-accent">{s.metric}</p>
                <p className="mt-1 text-sm text-text-2">{s.metricLabel}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>
      <Section title="In their words">
        <Testimonials />
      </Section>
      <BigCta />
    </>
  );
}
