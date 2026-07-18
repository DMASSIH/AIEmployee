import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Migrations run as the OWNER/superuser, NOT the app role: only the owner
    // may CREATE EXTENSION, create tables, and define RLS policies. The app
    // connects via DATABASE_URL (aie_app); drizzle-kit uses this separate URL.
    // eslint-disable-next-line no-restricted-globals
    url: process.env.MIGRATION_DATABASE_URL ?? 'postgresql://postgres:dev@localhost:5432/aie',
  },
  strict: true,
  verbose: true,
});
