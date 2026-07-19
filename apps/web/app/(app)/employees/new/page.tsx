'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Bot, Check, Headset, LineChart, ShoppingBag, Sparkles } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Field,
  Input,
  RadioGroup,
  RadioItem,
  Textarea,
  cn,
  toast,
} from '@aie/ui';
import { PageHeader } from '@/components/shell/page-header';

const templates = [
  { id: 'support', icon: Headset, name: 'Customer Support', role: 'Customer Support Agent', desc: 'Answers questions about orders, refunds, and accounts.' },
  { id: 'sales', icon: ShoppingBag, name: 'Sales Assistant', role: 'Sales Development Rep', desc: 'Qualifies leads and books meetings.' },
  { id: 'ops', icon: LineChart, name: 'Operations', role: 'Operations Coordinator', desc: 'Tracks tasks, invoices, and confirmations.' },
  { id: 'custom', icon: Sparkles, name: 'Start from scratch', role: '', desc: 'Define a completely custom role.' },
];

const autonomyOptions = [
  { value: 'draft_only', label: 'Draft only', desc: 'Writes replies for a human to review and send.' },
  { value: 'approve_first', label: 'Approve first', desc: 'Drafts and waits for one-click approval before sending.' },
  { value: 'autonomous', label: 'Autonomous', desc: 'Handles conversations end to end within its guardrails.' },
];

const steps = ['Template', 'Identity', 'Instructions', 'Autonomy'];

export default function NewEmployeePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [template, setTemplate] = useState('support');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Customer Support Agent');
  const [jd, setJd] = useState('');
  const [autonomy, setAutonomy] = useState('approve_first');

  const canNext =
    (step === 0 && !!template) ||
    (step === 1 && name.trim() && role.trim()) ||
    (step === 2 && jd.trim().length >= 20) ||
    step === 3;

  const finish = () => {
    toast.success(`${name || 'Your employee'} is onboarding`, 'This is a UI preview — hiring goes live in a later milestone.');
    router.push('/employees');
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/employees" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text">
          <ArrowLeft className="size-4" /> Back to employees
        </Link>
        <PageHeader title="Hire an AI employee" description="Four quick steps to put a new teammate to work." />
      </div>

      {/* Stepper */}
      <ol className="flex items-center gap-2">
        {steps.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-medium transition-colors',
                i < step
                  ? 'bg-accent text-white'
                  : i === step
                    ? 'bg-accent-soft text-accent ring-2 ring-accent/30'
                    : 'bg-surface-2 text-text-3',
              )}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={cn('hidden text-[13px] font-medium sm:block', i === step ? 'text-text' : 'text-text-3')}>
              {label}
            </span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="flex flex-col gap-5">
          {step === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTemplate(t.id);
                    if (t.role) setRole(t.role);
                  }}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-md border p-4 text-left transition-all',
                    template === t.id
                      ? 'border-accent bg-accent-soft/40 ring-1 ring-accent/30'
                      : 'border-border hover:border-border-strong hover:bg-surface-2',
                  )}
                >
                  <span className="flex size-9 items-center justify-center rounded-md bg-surface-2 text-text-2">
                    <t.icon className="size-5" />
                  </span>
                  <span className="text-sm font-semibold">{t.name}</span>
                  <span className="text-[13px] leading-snug text-text-2">{t.desc}</span>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <>
              <div className="flex items-center gap-4 rounded-md bg-surface-2/60 p-4">
                <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-lg font-semibold text-accent">
                  {name ? name[0]?.toUpperCase() : <Bot className="size-6" />}
                </span>
                <p className="text-[13px] text-text-2">
                  Give your employee a name — it makes the whole team feel more real.
                </p>
              </div>
              <Field label="Name" required>
                {(p) => <Input {...p} placeholder="Maya" value={name} onChange={(e) => setName(e.target.value)} />}
              </Field>
              <Field label="Role title" required>
                {(p) => <Input {...p} placeholder="Customer Support Agent" value={role} onChange={(e) => setRole(e.target.value)} />}
              </Field>
            </>
          )}

          {step === 2 && (
            <Field
              label="Job description"
              hint="Write it like you're briefing a new hire — responsibilities, boundaries, and when to escalate."
              required
            >
              {(p) => (
                <Textarea
                  {...p}
                  rows={8}
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  placeholder="Answer customer emails about orders, refunds, and shipping. Escalate anything involving legal threats or refunds over $500…"
                />
              )}
            </Field>
          )}

          {step === 3 && (
            <RadioGroup value={autonomy} onValueChange={setAutonomy} className="flex flex-col gap-3">
              {autonomyOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors',
                    autonomy === opt.value ? 'border-accent bg-accent-soft/40' : 'border-border hover:bg-surface-2',
                  )}
                >
                  <RadioItem value={opt.value} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-[13px] text-text-2">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            Continue <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={finish}>
            <Check className="size-4" /> Hire {name || 'employee'}
          </Button>
        )}
      </div>
    </div>
  );
}
