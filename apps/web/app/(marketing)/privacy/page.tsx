import type { Metadata } from 'next';
import { PageIntro, Section } from '@/components/marketing/sections';

export const metadata: Metadata = { title: 'Privacy Policy' };

const sections = [
  { t: '1. Data we collect', b: 'Account data (name, email, password hash), workspace content you provide (knowledge sources, job descriptions, conversations), and usage telemetry needed to operate and bill the service. We collect nothing from your customers beyond the conversations your AI employees handle on your behalf.' },
  { t: '2. How we use it', b: 'To provide the service, enforce plan entitlements, improve reliability, and send transactional email. We do not sell personal data, and we do not train shared models on your workspace content.' },
  { t: '3. Tenant isolation', b: 'Workspace data is segregated per organization and enforced with database row-level security. Cross-tenant access is technically prevented, audited, and tested on every release.' },
  { t: '4. Subprocessors', b: 'We use a small set of infrastructure subprocessors (cloud hosting, model inference, email delivery, payments). The current list is available on request and contractually bound to equivalent protections.' },
  { t: '5. Retention & deletion', b: 'Workspace content is retained while your account is active. Deleting a knowledge source deletes its derived chunks; deleting your organization schedules full erasure within 30 days, backups included.' },
  { t: '6. Your rights', b: 'Under GDPR you may access, correct, export, or erase your personal data. Contact privacy@aiemployee.com and we will respond within 30 days.' },
  { t: '7. Contact', b: 'AI Employee AB, Regeringsgatan 29, 111 53 Stockholm, Sweden — privacy@aiemployee.com.' },
];

export default function PrivacyPage() {
  return (
    <>
      <PageIntro eyebrow="Legal" title="Privacy Policy" lead="Last updated July 1, 2026. The short version: your data is yours, it stays in your tenant, and we never train shared models on it." />
      <Section className="max-w-3xl pt-0">
        <div className="flex flex-col gap-8">
          {sections.map((s) => (
            <div key={s.t}>
              <h2 className="text-[17px] font-semibold">{s.t}</h2>
              <p className="mt-2 leading-relaxed text-text-2">{s.b}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
