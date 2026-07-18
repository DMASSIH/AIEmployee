import { describe, it, expect, afterAll } from 'vitest';
import { createDb, sql, type Db } from '../src/index';

/**
 * Security (integration): proves the application role `aie_app` is genuinely
 * least-privilege — it cannot escalate, alter schema, disable RLS, or read the
 * migrations journal. Complements the RLS read/write suites (test:withorg,
 * tests/rls-isolation.sql). Opt-in: runs only with INTEGRATION=1 and a live DB
 * reached via DATABASE_URL (which must be the aie_app role).
 */
const RUN = process.env.INTEGRATION === '1' && !!process.env.DATABASE_URL;
const appUrl = process.env.DATABASE_URL ?? '';

let db: Db;

describe.skipIf(!RUN)('aie_app least-privilege guarantees', () => {
  db = createDb(appUrl);

  afterAll(async () => {
    await db.$client.end({ timeout: 5 });
  });

  it('is a non-superuser role that cannot bypass RLS', async () => {
    const rows = await db.execute(
      sql`select rolsuper, rolbypassrls, rolcreaterole, rolcreatedb
          from pg_roles where rolname = 'aie_app'`,
    );
    const r = rows[0] as Record<string, boolean>;
    expect(r.rolsuper).toBe(false);
    expect(r.rolbypassrls).toBe(false);
    expect(r.rolcreaterole).toBe(false);
    expect(r.rolcreatedb).toBe(false);
  });

  it('cannot create schema objects', async () => {
    await expect(db.execute(sql`create table _ci_probe (id int)`)).rejects.toThrow();
  });

  it('cannot disable row-level security on a tenant table', async () => {
    await expect(
      db.execute(sql`alter table employees disable row level security`),
    ).rejects.toThrow();
  });

  it('cannot read the migrations journal (drizzle schema)', async () => {
    await expect(
      db.execute(sql`select * from drizzle.__drizzle_migrations`),
    ).rejects.toThrow();
  });
});
