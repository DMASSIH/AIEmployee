'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { Check, X } from 'lucide-react';
import { Alert, Button, Field, Input, cn } from '@aie/ui';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

/** Mirrors the API's password policy (length-based, NIST-style). */
const checks = [
  { label: 'At least 10 characters', test: (pw: string) => pw.length >= 10 },
  { label: 'Not just one repeated character', test: (pw: string) => new Set(pw).size > 2 },
];

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const results = useMemo(() => checks.map((c) => c.test(password)), [password]);
  const valid = results.every(Boolean);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setError(null);
    setBusy(true);
    try {
      await api.auth.register({ displayName, email, password });
      const user = await api.auth.login({ email, password });
      setUser(user);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Is the API running?');
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1.5 text-sm text-text-2">Free 14-day trial · no credit card required.</p>

      <form onSubmit={(e) => void submit(e)} className="mt-8 flex flex-col gap-5">
        {error && <Alert tone="danger" title={error} />}
        <Field label="Full name" required>
          {(p) => (
            <Input
              {...p}
              autoComplete="name"
              required
              placeholder="Ellen Berg"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
        </Field>
        <Field label="Work email" required>
          {(p) => (
            <Input
              {...p}
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>
        <Field label="Password" required>
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="new-password"
              required
              placeholder="Pick something long"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        {password.length > 0 && (
          <ul className="-mt-2 flex flex-col gap-1.5" aria-live="polite">
            {checks.map((c, i) => (
              <li
                key={c.label}
                className={cn(
                  'flex items-center gap-2 text-[13px]',
                  results[i] ? 'text-success' : 'text-text-3',
                )}
              >
                {results[i] ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                {c.label}
              </li>
            ))}
          </ul>
        )}
        <Button type="submit" size="lg" loading={busy} disabled={!valid || busy}>
          Create account
        </Button>
      </form>

      <p className="mt-4 text-center text-[13px] leading-relaxed text-text-3">
        By continuing you agree to our{' '}
        <Link href="/terms" className="underline hover:text-text">Terms</Link> and{' '}
        <Link href="/privacy" className="underline hover:text-text">Privacy Policy</Link>.
      </p>
      <p className="mt-4 text-center text-sm text-text-2">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
