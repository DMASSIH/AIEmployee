'use client';

import { useState, type FormEvent } from 'react';
import { Mail, MapPin, MessagesSquare } from 'lucide-react';
import { Button, Field, Input, SuccessState, Textarea } from '@aie/ui';
import { PageIntro, Section } from '@/components/marketing/sections';

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <>
      <PageIntro
        eyebrow="Contact"
        title="Talk to a human (we still have those)"
        lead="Questions about plans, security reviews, or a deployment you're planning — we usually reply within a business day."
      />
      <Section className="max-w-5xl pt-0">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-border bg-surface p-8 shadow-card">
            {sent ? (
              <SuccessState
                title="Message sent"
                description="Thanks for reaching out — we'll get back to you at the address you provided, usually within one business day."
              />
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Name" required>
                    {(p) => <Input {...p} name="name" required placeholder="Ellen Berg" />}
                  </Field>
                  <Field label="Work email" required>
                    {(p) => <Input {...p} type="email" name="email" required placeholder="you@company.com" />}
                  </Field>
                </div>
                <Field label="Company">
                  {(p) => <Input {...p} name="company" placeholder="Acme Co" />}
                </Field>
                <Field label="How can we help?" required>
                  {(p) => (
                    <Textarea {...p} name="message" required rows={5} placeholder="Tell us about your team and what you'd like your first AI employee to do…" />
                  )}
                </Field>
                <Button type="submit" size="lg" className="self-start">
                  Send message
                </Button>
              </form>
            )}
          </div>
          <div className="flex flex-col gap-4">
            {[
              { icon: Mail, title: 'Email', body: 'hello@aiemployee.com' },
              { icon: MessagesSquare, title: 'Support', body: 'In-app chat · answered by Maya, escalated to humans' },
              { icon: MapPin, title: 'Office', body: 'Regeringsgatan 29, 111 53 Stockholm, Sweden' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4 rounded-lg border border-border bg-surface p-5 shadow-card">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                  <Icon className="size-5" aria-hidden />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-0.5 text-sm text-text-2">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
