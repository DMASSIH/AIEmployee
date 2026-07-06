/**
 * Tenant-isolation smoke test through the REAL code path (withOrg + Drizzle),
 * connected as the non-superuser app role. Complements tests/rls-isolation.sql.
 * Run: RLS_SMOKE_URL=postgresql://aie_app:...@host/aie pnpm --filter @aie/db test:withorg
 * Expects the two seed orgs from the SQL suite to exist.
 */
import { createDb, withOrg, schema } from '../src/index';

const url = process.env.RLS_SMOKE_URL ?? 'postgresql://aie_app:dev@127.0.0.1:5432/aie';
const db = createDb(url);

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

const a = await withOrg(db, ORG_A, (tx) =>
  tx.select({ name: schema.employees.name }).from(schema.employees),
);
const b = await withOrg(db, ORG_B, (tx) =>
  tx.select({ name: schema.employees.name }).from(schema.employees),
);
// No tenant context at all → RLS must return nothing.
const none = await db.select({ name: schema.employees.name }).from(schema.employees);

console.warn('withOrg(A):', JSON.stringify(a));
console.warn('withOrg(B):', JSON.stringify(b));
console.warn('no context:', JSON.stringify(none));

const ok =
  a.length === 1 &&
  a[0]?.name === 'Maya' &&
  b.length === 1 &&
  b[0]?.name === 'Deniz' &&
  none.length === 0;

console.warn(ok ? 'WITHORG SMOKE: PASS' : 'WITHORG SMOKE: FAIL');
process.exit(ok ? 0 : 1);
