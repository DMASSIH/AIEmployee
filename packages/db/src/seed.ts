/**
 * Deterministic development seed.
 *
 * Runs as the SUPERUSER (MIGRATION_DATABASE_URL) on purpose: it populates two
 * different orgs in a single pass, and superusers bypass RLS by design. The
 * rows below are exactly what the tenant-isolation tests expect to find:
 *   - packages/db/tests/rls-isolation.sql  (org ids + Deniz's id are hard-coded)
 *   - packages/db/tests/withorg-smoke.ts   (exactly one employee per org)
 *
 * Idempotent — re-running is a no-op (ON CONFLICT DO NOTHING).
 * Run: pnpm --filter @aie/db db:seed   (or `pnpm db:seed` from the repo root)
 */
import { createDb, schema } from './index';

// Guard: this seed inserts fixed demo tenants and must never touch production.
// It refuses under NODE_ENV=production unless explicitly overridden.
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
  console.error(
    'SEED: refusing to run with NODE_ENV=production — this inserts demo tenants ' +
      '(Org A/B, Maya/Deniz) and is for local/dev only. ' +
      'Set ALLOW_PROD_SEED=true to override (not recommended).',
  );
  process.exit(1);
}

const url =
  process.env.MIGRATION_DATABASE_URL ?? 'postgresql://postgres:dev@localhost:5432/aie';

// UUIDs are fixed so the SQL/ORM isolation suites can reference them directly.
const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

const db = createDb(url);

await db
  .insert(schema.organizations)
  .values([
    { id: ORG_A, name: 'Org A (Acme)', slug: 'org-a' },
    { id: ORG_B, name: 'Org B (Globex)', slug: 'org-b' },
  ])
  .onConflictDoNothing();

await db
  .insert(schema.employees)
  .values([
    {
      // Org A sees only Maya (rls-isolation.sql TEST 2).
      id: 'aaaaaaaa-0000-0000-0000-000000000001',
      orgId: ORG_A,
      name: 'Maya',
      roleTitle: 'Customer Support Lead',
      jobDescription: 'Answers Org A customer emails and resolves support tickets.',
    },
    {
      // Deniz's id is targeted by the cross-tenant UPDATE probe (TEST 4).
      id: 'bbbbbbbb-0000-0000-0000-000000000001',
      orgId: ORG_B,
      name: 'Deniz',
      roleTitle: 'Sales Assistant',
      jobDescription: 'Qualifies inbound leads and books meetings for Org B.',
    },
  ])
  .onConflictDoNothing();

console.warn('SEED: ok — orgs {A,B} + employees {Maya, Deniz} present');
process.exit(0);
