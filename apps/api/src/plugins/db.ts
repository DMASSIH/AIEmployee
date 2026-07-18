import fp from 'fastify-plugin';
import { createDb, sql, type Db } from '@aie/db';

declare module 'fastify' {
  interface FastifyInstance {
    /** Drizzle client backed by a postgres-js pool. Injected, never a global. */
    db: Db;
  }
}

export interface DbPluginOptions {
  databaseUrl: string;
}

/**
 * Decorates the app with a Drizzle database client.
 *
 * Registered via fastify-plugin so `app.db` is available to sibling plugins and
 * every route without re-importing anything. Connectivity is verified once at
 * boot (fail fast on a bad URL), and the underlying pool is closed on shutdown
 * via the onClose hook — so `app.close()` releases all connections.
 */
export const dbPlugin = fp<DbPluginOptions>(
  async (app, opts) => {
    const db = createDb(opts.databaseUrl);

    await db.execute(sql`select 1`);
    app.log.info('PostgreSQL connected');

    app.decorate('db', db);

    app.addHook('onClose', async () => {
      await db.$client.end({ timeout: 5 });
      app.log.info('PostgreSQL pool closed');
    });
  },
  { name: 'db' },
);
