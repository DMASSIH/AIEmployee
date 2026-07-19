import type { ReactNode } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { AuthProvider } from '@/providers/auth-provider';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col bg-bg">
        <header className="flex h-16 items-center px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-md bg-accent text-white">
              <Sparkles className="size-4" aria-hidden />
            </span>
            AI Employee
          </Link>
        </header>
        <main className="flex flex-1 items-start justify-center px-6 pb-16 pt-10 sm:pt-16">
          <div className="w-full max-w-sm animate-slide-up">{children}</div>
        </main>
      </div>
    </AuthProvider>
  );
}
