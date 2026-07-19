import type { Metadata } from 'next';
import { Avatar } from '@aie/ui';
import { BigCta, PageIntro, Section } from '@/components/marketing/sections';

export const metadata: Metadata = { title: 'About' };

const team = [
  { name: 'Ellen Berg', role: 'Co-founder & CEO' },
  { name: 'Jonas Lind', role: 'Co-founder & CTO' },
  { name: 'Priya Raman', role: 'Head of Product' },
  { name: 'Marcus Weber', role: 'Head of Engineering' },
  { name: 'Sofia Lindqvist', role: 'Head of Customer Experience' },
  { name: 'David Chen', role: 'Founding Engineer' },
];

export default function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="About"
        title="Headcount shouldn't be the ceiling on ambition"
        lead="We started AI Employee after watching brilliant small teams turn down growth because they couldn't hire fast enough. The work was repetitive; the hiring was hard; the software 'solutions' were chatbots that made customers angrier."
      />
      <Section className="max-w-3xl pt-0">
        <div className="flex flex-col gap-6 text-[16px] leading-relaxed text-text-2">
          <p>
            So we built something different: not a chatbot, but an <strong className="text-text">employee</strong>.
            Something you hire with a job description, train with your own knowledge, supervise
            while it earns trust, and eventually let work on its own — with guardrails enforced by
            the platform, not by hope.
          </p>
          <p>
            We're an engineering-led company based in Stockholm. We care about craft: the kind of
            security you can audit, the kind of UI that gets out of your way, and the kind of AI
            behavior you can version, test, and roll back.
          </p>
          <p>
            Our own AI employees answer our support email, book our sales calls, and chase our
            invoices. We feel every rough edge before you do.
          </p>
        </div>
      </Section>
      <Section title="The humans behind the employees">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((person) => (
            <div key={person.name} className="flex items-center gap-4 rounded-lg border border-border bg-surface p-5 shadow-card">
              <Avatar name={person.name} size="lg" />
              <div>
                <h3 className="font-medium">{person.name}</h3>
                <p className="text-sm text-text-2">{person.role}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <BigCta />
    </>
  );
}
