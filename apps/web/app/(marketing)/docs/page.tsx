import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Bot, Code2, KeyRound, Rocket, Webhook } from 'lucide-react';
import { CodeBlock } from '@aie/ui';
import { PageIntro, Section } from '@/components/marketing/sections';

export const metadata: Metadata = { title: 'Documentation' };

const guides = [
  { icon: Rocket, title: 'Quickstart', description: 'Create a workspace, hire your first employee, and answer a real email in under 10 minutes.' },
  { icon: Bot, title: 'Hiring & job descriptions', description: 'How the JD compiler works, role templates, and patterns for prompts that behave.' },
  { icon: BookOpen, title: 'Knowledge & training', description: 'Supported sources, chunking behavior, and how retrieval decides what an employee knows.' },
  { icon: KeyRound, title: 'Authentication', description: 'Session cookies for the dashboard, API keys for servers, and scoping permissions.' },
  { icon: Code2, title: 'REST API reference', description: 'Every endpoint under /v1 with request/response schemas and error semantics.' },
  { icon: Webhook, title: 'Webhooks', description: 'Subscribe to conversation, escalation, and billing events with signed deliveries.' },
];

export default function DocsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Documentation"
        title="Build with AI Employee"
        lead="Guides, references, and examples — from the first hire to a fully automated workflow."
      />
      <Section className="pt-0">
        <div className="mx-auto mb-12 max-w-2xl">
          <CodeBlock
            language="bash"
            code={`curl https://api.aiemployee.com/v1/organizations \\
  -H "Authorization: Bearer aie_live_..." \\
  -H "Content-Type: application/json"`}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map(({ icon: Icon, title, description }) => (
            <Link
              key={title}
              href="/docs"
              className="group rounded-lg border border-border bg-surface p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-md bg-accent-soft text-accent">
                <Icon className="size-5" aria-hidden />
              </div>
              <h3 className="flex items-center gap-1.5 text-[15px] font-semibold">
                {title}
                <ArrowRight className="size-4 text-text-3 transition-transform group-hover:translate-x-0.5" />
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-2">{description}</p>
            </Link>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-text-3">
          Full documentation portal ships alongside the public API. These guides open in-app today.
        </p>
      </Section>
    </>
  );
}
