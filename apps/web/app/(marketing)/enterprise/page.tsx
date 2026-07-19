import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2, Headset, KeyRound, Landmark, ScrollText, ShieldCheck } from 'lucide-react';
import { FeatureGrid, PageIntro, Section, CheckList } from '@/components/marketing/sections';

export const metadata: Metadata = { title: 'Enterprise' };

export default function EnterprisePage() {
  return (
    <>
      <PageIntro
        eyebrow="Enterprise"
        title="AI employees for organizations that can't compromise"
        lead="Custom limits, dedicated infrastructure options, and the compliance posture your security team will actually sign off on."
      >
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/contact"
            className="inline-flex h-11 items-center rounded-md bg-accent px-6 text-[15px] font-medium text-white shadow-card transition-colors hover:bg-accent-hover"
          >
            Contact sales
          </Link>
          <Link
            href="/security"
            className="inline-flex h-11 items-center rounded-md border border-border bg-surface px-6 text-[15px] font-medium shadow-card transition-colors hover:bg-surface-2"
          >
            Security overview
          </Link>
        </div>
      </PageIntro>

      <Section>
        <FeatureGrid
          items={[
            { icon: Building2, title: 'Unlimited scale', description: 'Custom employee counts, task volumes, and knowledge quotas negotiated for your footprint.' },
            { icon: KeyRound, title: 'SSO & SCIM', description: 'SAML single sign-on and automated user provisioning from your identity provider.' },
            { icon: ShieldCheck, title: 'Database-enforced isolation', description: 'Row-level security in Postgres with least-privilege roles — isolation your auditors can verify.' },
            { icon: ScrollText, title: 'Audit everything', description: 'Append-only audit trail of every action by every human and every AI, exportable to your SIEM.' },
            { icon: Landmark, title: 'Compliance', description: 'GDPR-ready with EU data residency options. SOC 2 Type II report available under NDA.' },
            { icon: Headset, title: 'White-glove onboarding', description: 'A dedicated engineer helps model your roles, migrate knowledge, and tune autonomy safely.' },
          ]}
        />
      </Section>

      <Section title="What the Enterprise plan includes" className="max-w-3xl">
        <div className="rounded-lg border border-border bg-surface p-8 shadow-card">
          <CheckList
            className="grid gap-3 sm:grid-cols-2"
            items={[
              'Custom entitlements & seats',
              'SAML SSO + SCIM provisioning',
              '99.9% uptime SLA',
              'EU data residency',
              'Dedicated support channel',
              'Security review support',
              'Custom DPA & MSA',
              'Quarterly business reviews',
            ]}
          />
        </div>
      </Section>
    </>
  );
}
