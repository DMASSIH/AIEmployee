'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Button, Field, Input, SuccessState } from '@aie/ui';

/** UI only — token validation + persistence ship with a later backend milestone. */
export default function ResetPasswordPage() {
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const mismatch = confirm.length > 0 && password !== confirm;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (password.length >= 10 && !mismatch) setDone(true);
  };

  if (done) {
    return (
      <SuccessState title="Password updated" description="Your password has been changed. Sign in with your new credentials.">
        <Link
          href="/login"
          className="mt-4 inline-flex h-10 items-center rounded-md bg-accent px-5 text-sm font-medium text-white shadow-card transition-colors hover:bg-accent-hover"
        >
          Sign in
        </Link>
      </SuccessState>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-1.5 text-sm text-text-2">Make it long — length beats complexity.</p>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
        <Field label="New password" hint="At least 10 characters" required>
          {(p) => (
            <Input
              {...p}
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <Field label="Confirm password" error={mismatch ? 'Passwords do not match' : undefined} required>
          {(p) => (
            <Input
              {...p}
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" size="lg" disabled={password.length < 10 || mismatch}>
          Update password
        </Button>
      </form>
    </div>
  );
}
