import type { Metadata } from 'next';
import {
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  GitBranch,
  Inbox,
  KeyRound,
  LineChart,
  MessageSquare,
  ShieldCheck,
  SlidersHorizontal,
  Wand2,
  Workflow,
} from 'lucide-react';
import { BigCta, FeatureGrid, PageIntro, Section, CheckList } from '@/components/marketing/sections';

export const metadata: Metadata = { title: 'Features' };

export default function FeaturesPage() {
  return (
    <>
      <PageIntro
        eyebrow="Features"
        title="Everything a great hire brings — on day one"
        lead="AI employees come with channels, training, memory, guardrails, and analytics built in. You write the job description; the platform does the rest."
      />

      <Section>
        <FeatureGrid
          items={[
            { icon: Wand2, title: 'Job description → system prompt', description: 'Write the role in plain language. Our compiler turns it into a versioned, testable system prompt.' },
            { icon: BookOpen, title: 'Knowledge training', description: 'PDFs, URLs, Notion, and manual notes — chunked, embedded, and searchable with hybrid retrieval.' },
            { icon: BrainCircuit, title: 'Long-term memory', description: 'Corrections and preferences stick. Tell an employee once; it remembers across conversations.' },
            { icon: SlidersHorizontal, title: 'Autonomy controls', description: 'Draft-only, approve-first, or autonomous — enforced server-side per employee, per tool.' },
            { icon: Inbox, title: 'Email channel', description: 'A real address or forwarding from your shared inbox, with threading handled correctly.' },
            { icon: MessageSquare, title: 'Web widget', description: 'A themable chat widget that answers from your knowledge — not canned deflections.' },
            { icon: CalendarCheck, title: 'Scheduling', description: 'Qualify, propose times, and book directly on the right calendar with context attached.' },
            { icon: GitBranch, title: 'Prompt versioning', description: 'Every change is a version with a changelog. Roll back instantly when an edit misfires.' },
            { icon: Workflow, title: 'Tools & actions', description: 'Order lookup, refunds, calendar booking — each tool individually toggled and approval-gated.' },
            { icon: LineChart, title: 'Analytics', description: 'Success rate, latency, token cost, and volume per employee, channel, and day.' },
            { icon: ShieldCheck, title: 'Guardrails', description: 'Escalation rules, spend limits, and policy checks run before anything leaves the building.' },
            { icon: KeyRound, title: 'API access', description: 'Everything in the dashboard is available over a clean, versioned REST API.' },
          ]}
        />
      </Section>

      <Section title="Built for the way teams actually adopt AI">
        <div className="mx-auto grid max-w-4xl gap-10 sm:grid-cols-3">
          <div>
            <h3 className="mb-3 font-semibold">Week 1 — Draft mode</h3>
            <CheckList items={['Employee drafts, humans send', 'Zero risk to customers', 'Team reviews tone & accuracy']} />
          </div>
          <div>
            <h3 className="mb-3 font-semibold">Week 2 — Approvals</h3>
            <CheckList items={['One-click approve & send', 'Response times collapse', 'Corrections become memory']} />
          </div>
          <div>
            <h3 className="mb-3 font-semibold">Week 3 — Autonomy</h3>
            <CheckList items={['Routine work fully handled', 'Escalation rules as safety net', 'Team focuses on the hard 10%']} />
          </div>
        </div>
      </Section>

      <BigCta />
    </>
  );
}
