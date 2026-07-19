'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Button, Field, Input, SuccessState } from '@aie/ui';

/** UI only — the reset email flow ships with a later backend milestone. */
export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  if (sent) {
    return (
      <SuccessState
        title="Check your inbox"
        description={`If an account exists for ${email}, we've sent a link to reset your password. The link expires in 30 minutes.`}
      >
        <Link href="/login" className="mt-4 text-sm font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      </SuccessState>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1.5 text-sm text-text-2">
        Enter your email and we&apos;ll send you a secure reset link.
      </p>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
        <Field label="Email" required>
          {(p) => (
            <Input
              {...p}
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" size="lg">
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-text-2">
        Remembered it?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
