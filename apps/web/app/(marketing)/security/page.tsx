import type { Metadata } from 'next';
import { Database, FileLock2, Fingerprint, KeyRound, ScrollText, ShieldCheck } from 'lucide-react';
import { BigCta, FeatureGrid, PageIntro, Section } from '@/components/marketing/sections';

export const metadata: Metadata = { title: 'Security' };

export default function SecurityPage() {
  return (
    <>
      <PageIntro
        eyebrow="Security"
        title="Security that's enforced, not promised"
        lead="Most platforms isolate tenants in application code. We do it in the database itself — and design every layer as if the one above it will fail."
      />

      <Section>
        <FeatureGrid
          items={[
            { icon: Database, title: 'Row-level security', description: 'Every tenant table carries FORCE row-level security in Postgres. No org context means zero rows — even for our own services.' },
            { icon: KeyRound, title: 'Least privilege', description: 'The application connects as a non-superuser role that cannot alter schema, disable policies, or read migration state.' },
            { icon: Fingerprint, title: 'Modern authentication', description: 'Argon2id password hashing at OWASP-recommended parameters, HttpOnly signed session cookies, timing-safe verification.' },
            { icon: ScrollText, title: 'Append-only audit', description: 'A database trigger makes audit history immutable — not even a buggy code path can rewrite it.' },
            { icon: FileLock2, title: 'Encryption', description: 'TLS 1.2+ in transit, AES-256 at rest, secrets managed outside the codebase with rotation policies.' },
            { icon: ShieldCheck, title: 'AI guardrails', description: 'Server-side autonomy enforcement, per-tool approval gates, spend limits, and escalation rules on every employee.' },
          ]}
        />
      </Section>

      <Section title="Practices" className="max-w-3xl">
        <div className="flex flex-col gap-4">
          {[
            { t: 'Development', d: 'Every change ships through CI gates: type checking, linting, hermetic tests, and a cross-tenant attack suite that runs against a real database on every pull request.' },
            { t: 'Data handling', d: 'Customer knowledge is stored per-tenant, embedded per-tenant, and retrieved through org-scoped queries. Deleting a source deletes its chunks.' },
            { t: 'Disclosure', d: 'Found something? Email security@aiemployee.com — we acknowledge within 24 hours and keep you informed through resolution.' },
          ].map((item) => (
            <div key={item.t} className="rounded-lg border border-border bg-surface p-6 shadow-card">
              <h3 className="font-semibold">{item.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-2">{item.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <BigCta title="Bring your security team" lead="We're at our best answering hard questions." />
    </>
  );
}
