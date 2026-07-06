import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema/index';

export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
  });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/**
 * THE tenant boundary. Every org-scoped query in the entire application goes
 * through this helper — it opens a transaction and sets the RLS context so
 * Postgres itself refuses cross-tenant reads/writes.
 *
 *   const rows = await withOrg(db, orgId, (tx) =>
 *     tx.select().from(schema.employees),
 *   );
 *
 * set_config(..., true) is transaction-local: it evaporates on commit, so a
 * pooled connection can never leak one org's context into the next request.
 *
 * NOTE: RLS only binds when the app connects as a NON-superuser role
 * (`aie_app` — see infra/db/provision-app-role.sql). Superusers bypass RLS.
 */
export async function withOrg<T>(db: Db, orgId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_org_id', ${orgId}, true)`);
    return fn(tx);
  });
}

export { schema, sql };
