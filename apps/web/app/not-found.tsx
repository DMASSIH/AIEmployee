import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-sm font-medium text-accent">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">This page doesn&apos;t exist</h1>
      <p className="max-w-md text-[15px] text-text-2">
        The page you&apos;re looking for was moved, renamed, or never hired in the first place.
      </p>
      <div className="mt-4 flex gap-3">
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-md bg-accent px-3.5 text-sm font-medium text-white shadow-card transition-colors hover:bg-accent-hover"
        >
          Back to home
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3.5 text-sm font-medium shadow-card transition-colors hover:bg-surface-2"
        >
          Open dashboard
        </Link>
      </div>
    </main>
  );
}
