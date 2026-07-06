import { Button } from '@aie/ui';
import { PLANS } from '@aie/core';

/**
 * Placeholder home — proves the whole chain works end to end:
 * Tailwind v4 tokens → @aie/ui component → @aie/core shared config.
 * Replaced by the real landing page in a later milestone.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">AI Employee</h1>
      <p className="text-center text-[15px] text-text-2">
        Monorepo scaffold is alive. Plans loaded from <code>@aie/core</code>:{' '}
        {Object.values(PLANS)
          .map((p) => p.label)
          .join(' · ')}
      </p>
      <div className="flex gap-3">
        <Button>Hire your first employee</Button>
        <Button variant="ghost">Watch demo</Button>
      </div>
    </main>
  );
}
