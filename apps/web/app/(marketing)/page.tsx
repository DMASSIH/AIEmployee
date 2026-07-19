import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Bot,
  CalendarCheck,
  Gauge,
  Inbox,
  Lock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { Badge } from '@aie/ui';
import {
  BigCta,
  FeatureGrid,
  LogoCloud,
  Section,
  Testimonials,
} from '@/components/marketing/sections';

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_400px_at_50%_-100px,var(--color-accent-soft),transparent)]"
        />
        <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-24 text-center sm:pt-32">
          <Badge tone="accent" className="mb-6 px-3 py-1">
            <Sparkles className="size-3.5" /> Now with autonomous mode
          </Badge>
          <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Hire AI employees that <span className="text-accent">actually work</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-text-2 sm:text-xl">
            Give them a job description. Train them on your knowledge. They answer email, book
            meetings, and talk to customers — while you approve, supervise, or fully let go.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-6 text-[15px] font-medium text-white shadow-card transition-all hover:bg-accent-hover"
            >
              Hire your first employee <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/features"
              className="inline-flex h-11 items-center rounded-md border border-border bg-surface px-6 text-[15px] font-medium shadow-card transition-colors hover:bg-surface-2"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-text-3">Free 14-day trial · No credit card required</p>
        </div>

        {/* Product visual */}
        <div className="relative mx-auto max-w-5xl px-6 pb-20">
          <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-modal">
            <div className="flex items-center gap-1.5 border-b border-border bg-surface-2/60 px-4 py-3">
              <span className="size-2.5 rounded-full bg-danger/50" />
              <span className="size-2.5 rounded-full bg-warning/50" />
              <span className="size-2.5 rounded-full bg-success/50" />
              <span className="ml-3 text-xs text-text-3">app.aiemployee.com — Conversations</span>
            </div>
            <div className="grid sm:grid-cols-[240px_1fr]">
              <div className="hidden border-r border-border bg-surface-2/40 p-4 sm:block">
                {['Maya · Support', 'Deniz · Sales', 'Sana · Operations'].map((n, i) => (
                  <div
                    key={n}
                    className={`mb-1 rounded-md px-3 py-2 text-sm ${i === 0 ? 'bg-accent-soft font-medium text-accent' : 'text-text-2'}`}
                  >
                    {n}
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-4 p-6">
                <div className="max-w-md self-start rounded-lg rounded-tl-sm bg-surface-2 px-4 py-3 text-sm text-text">
                  Hi, I ordered two weeks ago (order #A-58821) and still nothing. Can you check?
                </div>
                <div className="max-w-md self-end rounded-lg rounded-br-sm bg-accent px-4 py-3 text-sm text-white shadow-card">
                  Hi Hanna! I checked with the carrier — your order left our Malmö warehouse
                  yesterday and arrives <strong>Tuesday, July 21</strong>. Tracking: PN-4471-SE. 💛
                </div>
                <div className="flex items-center gap-2 self-end text-xs text-text-3">
                  <ShieldCheck className="size-3.5 text-success" /> Sent autonomously · policy check
                  passed
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LogoCloud />

      <Section
        title="A full team, minus the headcount"
        lead="Every AI employee gets a role, a job description, training on your knowledge, and exactly as much autonomy as you're comfortable with."
      >
        <FeatureGrid
          items={[
            { icon: Inbox, title: 'Answers email', description: 'Connects to your shared inbox, understands context, and replies in your voice — with policies enforced on every send.' },
            { icon: MessageSquare, title: 'Talks to customers', description: 'A website widget that resolves real questions from your docs instead of deflecting to a contact form.' },
            { icon: CalendarCheck, title: 'Books meetings', description: 'Qualifies leads and puts discovery calls straight on the right calendar with full context attached.' },
            { icon: BookOpen, title: 'Trained on your knowledge', description: 'Upload handbooks, policies, and catalogs. Hybrid retrieval means answers are grounded, not guessed.' },
            { icon: Workflow, title: 'Autonomy you control', description: 'Draft-only, approve-first, or fully autonomous — per employee, changeable any time, enforced server-side.' },
            { icon: Gauge, title: 'Measured like a teammate', description: 'Success rate, latency, cost, and conversation quality on one dashboard. Feedback makes them better.' },
          ]}
        />
      </Section>

      <Section
        title="Meet the team you're about to hire"
        lead="Start from a role template and have your first employee working the same afternoon."
      >
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { name: 'Maya', role: 'Customer Support Lead', desc: 'Resolves order, refund, and shipping questions across email and chat.', stat: '96% resolution' },
            { name: 'Deniz', role: 'Sales Assistant', desc: 'Qualifies inbound leads, answers pricing questions, books discovery calls.', stat: '3× faster response' },
            { name: 'Sana', role: 'Operations Coordinator', desc: 'Chases invoices, tracks confirmations, keeps the weekly digest current.', stat: '12 hrs saved / week' },
          ].map((p) => (
            <div key={p.name} className="rounded-lg border border-border bg-surface p-6 shadow-card">
              <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-accent-soft text-lg font-semibold text-accent">
                {p.name[0]}
              </div>
              <h3 className="font-semibold">{p.name}</h3>
              <p className="text-[13px] font-medium text-accent">{p.role}</p>
              <p className="mt-2.5 text-sm leading-relaxed text-text-2">{p.desc}</p>
              <p className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-success">
                <Bot className="size-3.5" /> {p.stat}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Loved by lean teams"
        lead="From two-person studios to hundred-person logistics companies."
      >
        <Testimonials />
      </Section>

      <Section className="pt-0">
        <div className="grid items-center gap-10 rounded-lg border border-border bg-surface p-8 shadow-card lg:grid-cols-2 lg:p-12">
          <div>
            <div className="mb-4 flex size-10 items-center justify-center rounded-md bg-success-soft text-success">
              <Lock className="size-5" aria-hidden />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Enterprise-grade isolation, from day one</h2>
            <p className="mt-3 leading-relaxed text-text-2">
              Tenant isolation is enforced by the database itself with row-level security — not
              just application code. Argon2id password hashing, least-privilege service roles, and
              an append-only audit trail come standard on every plan.
            </p>
            <Link href="/security" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
              Read the security overview <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="rounded-md bg-ink p-5 font-mono text-[13px] leading-relaxed text-ink-text/80 shadow-pop">
            <p className="text-ink-text/50">-- every tenant table, enforced in Postgres</p>
            <p>CREATE POLICY tenant_isolation ON employees</p>
            <p className="pl-4">USING (org_id = current_org());</p>
            <p className="mt-3 text-ink-text/50">-- no context → no rows. ever.</p>
            <p>ALTER TABLE employees FORCE ROW LEVEL SECURITY;</p>
          </div>
        </div>
      </Section>

      <BigCta />
    </>
  );
}
