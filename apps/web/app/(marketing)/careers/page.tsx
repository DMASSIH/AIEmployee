import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { Badge } from '@aie/ui';
import { BigCta, PageIntro, Section, CheckList } from '@/components/marketing/sections';

export const metadata: Metadata = { title: 'Careers' };

const openings = [
  { title: 'Senior Product Engineer', team: 'Engineering', location: 'Stockholm / Remote EU', type: 'Full-time' },
  { title: 'AI Systems Engineer', team: 'Engineering', location: 'Stockholm / Remote EU', type: 'Full-time' },
  { title: 'Product Designer', team: 'Design', location: 'Stockholm', type: 'Full-time' },
  { title: 'Developer Advocate', team: 'Marketing', location: 'Remote EU', type: 'Full-time' },
  { title: 'Enterprise Account Executive', team: 'Sales', location: 'Stockholm / London', type: 'Full-time' },
];

export default function CareersPage() {
  return (
    <>
      <PageIntro
        eyebrow="Careers"
        title="Build the workforce of the future"
        lead="We're a small team in Stockholm giving every company on earth the ability to hire beyond headcount. Come do the best work of your career."
      />
      <Section className="max-w-3xl pt-0">
        <div className="mb-12 rounded-lg border border-border bg-surface p-8 shadow-card">
          <h2 className="font-semibold">How we work</h2>
          <CheckList
            className="mt-4 grid gap-3 sm:grid-cols-2"
            items={[
              'Small teams, real ownership',
              'Ship weekly, demo on Fridays',
              'Hybrid Stockholm HQ + remote EU',
              'Top-of-market compensation & equity',
              'Hardware budget, no questions',
              'We use our own AI employees daily',
            ]}
          />
        </div>
        <h2 className="mb-5 text-xl font-semibold">Open positions</h2>
        <ul className="flex flex-col gap-3">
          {openings.map((job) => (
            <li key={job.title}>
              <Link href="/contact" className="group flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-5 shadow-card transition-all hover:border-accent/40 hover:shadow-pop">
                <div>
                  <h3 className="font-medium group-hover:text-accent">{job.title}</h3>
                  <p className="mt-1 flex items-center gap-3 text-[13px] text-text-3">
                    <Badge>{job.team}</Badge>
                    <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {job.location}</span>
                    <span>{job.type}</span>
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-text-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <BigCta title="Don't see your role?" lead="Exceptional people make their own roles. Tell us what you'd build." />
    </>
  );
}
