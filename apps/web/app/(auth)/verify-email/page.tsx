'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { Button, toast } from '@aie/ui';

/** UI only — verification tokens ship with a later backend milestone. */
export default function VerifyEmailPage() {
  const [resent, setResent] = useState(false);

  return (
    <div className="text-center">
      <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
        <MailCheck className="size-7" aria-hidden />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Verify your email</h1>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-text-2">
        We&apos;ve sent a verification link to your inbox. Click it to activate your workspace.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3">
        <Button
          variant="outline"
          disabled={resent}
          onClick={() => {
            setResent(true);
            toast.success('Verification email sent', 'Check your inbox — and the spam folder, just in case.');
          }}
        >
          {resent ? 'Email sent' : 'Resend email'}
        </Button>
        <Link href="/login" className="text-sm font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
