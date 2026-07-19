import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@aie/ui';
import { PageIntro, Section } from '@/components/marketing/sections';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Blog' };

const posts = [
  { slug: 'autonomy-ladder', tag: 'Product', title: 'The autonomy ladder: how teams actually learn to trust AI employees', excerpt: 'Nobody goes from zero to autonomous in a day. The teams that succeed climb three distinct rungs — and the platform should enforce each one.', date: '2026-07-10T00:00:00Z', reading: '6 min' },
  { slug: 'rls-tenant-isolation', tag: 'Engineering', title: 'Why we put tenant isolation in Postgres instead of promising it in code', excerpt: 'Application-level filtering fails silently. Row-level security fails loudly. A deep dive into our FORCE RLS architecture and the attack suite that guards it.', date: '2026-06-24T00:00:00Z', reading: '9 min' },
  { slug: 'jd-compiler', tag: 'Product', title: 'From job description to system prompt: inside the JD compiler', excerpt: 'The best prompt engineers on your team are the people who write job descriptions. Here is how we turn their words into reliable agent behavior.', date: '2026-06-08T00:00:00Z', reading: '7 min' },
  { slug: 'support-metrics', tag: 'Playbooks', title: 'The only four metrics that matter for AI support', excerpt: 'Resolution rate lies if you measure it wrong. What to track instead, and the thresholds that tell you an employee is ready for autonomy.', date: '2026-05-19T00:00:00Z', reading: '5 min' },
  { slug: 'hybrid-retrieval', tag: 'Engineering', title: 'Hybrid retrieval in production: vectors, keywords, and reciprocal rank fusion', excerpt: 'Pure vector search misses exact matches; pure keyword search misses meaning. How we fuse both — and when reranking is worth the latency.', date: '2026-05-02T00:00:00Z', reading: '11 min' },
  { slug: 'hiring-maya', tag: 'Customers', title: 'How Nordic Supply "hired" Maya and cut first response time by 94%', excerpt: 'A practical walkthrough of a real deployment: the job description, the knowledge sources, the guardrails, and the numbers after 90 days.', date: '2026-04-15T00:00:00Z', reading: '8 min' },
];

export default function BlogPage() {
  return (
    <>
      <PageIntro
        eyebrow="Blog"
        title="Notes from the frontier of digital labor"
        lead="Product updates, engineering deep-dives, and playbooks from teams running AI employees in production."
      />
      <Section className="pt-0">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.slug} href="/blog" className="group flex flex-col rounded-lg border border-border bg-surface p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop">
              <div className="flex items-center gap-3">
                <Badge tone="accent">{post.tag}</Badge>
                <span className="text-xs text-text-3">{post.reading} read</span>
              </div>
              <h2 className="mt-4 text-[17px] font-semibold leading-snug group-hover:text-accent">{post.title}</h2>
              <p className="mt-2.5 flex-1 text-sm leading-relaxed text-text-2">{post.excerpt}</p>
              <p className="mt-4 text-[13px] text-text-3">{formatDate(post.date)}</p>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
