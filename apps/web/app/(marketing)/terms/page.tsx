import type { Metadata } from 'next';
import { PageIntro, Section } from '@/components/marketing/sections';

export const metadata: Metadata = { title: 'Terms of Service' };

const sections = [
  { t: '1. The service', b: 'AI Employee provides a platform for creating and operating AI assistants ("AI employees") trained on content you supply. You retain all rights to your content; we operate the infrastructure that makes it useful.' },
  { t: '2. Accounts & workspaces', b: 'You are responsible for safeguarding your credentials and for activity in your workspace. Seats are per human; AI employees are licensed per plan.' },
  { t: '3. Acceptable use', b: 'No unlawful content, no impersonation without disclosure where required, no attempts to bypass tenant isolation or rate limits, and no use of the service to send spam.' },
  { t: '4. AI output', b: 'AI employees act under the autonomy settings and guardrails you configure. You are responsible for reviewing output where your configuration requires approval, and for compliance with disclosure obligations in your jurisdiction.' },
  { t: '5. Billing', b: 'Paid plans bill monthly or annually in advance. Task limits reset each billing period; unused tasks do not roll over. You may cancel any time, effective at period end.' },
  { t: '6. Availability & support', b: 'We target 99.9% monthly uptime. Scheduled maintenance is announced in advance. Support is provided in-app and by email according to your plan.' },
  { t: '7. Liability', b: 'The service is provided "as is." To the maximum extent permitted by law, our aggregate liability is limited to the fees you paid in the twelve months preceding the claim.' },
  { t: '8. Changes', b: 'We may update these terms with 30 days notice for material changes. Continued use after the effective date constitutes acceptance.' },
];

export default function TermsPage() {
  return (
    <>
      <PageIntro eyebrow="Legal" title="Terms of Service" lead="Last updated July 1, 2026. Effective for all workspaces." />
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
