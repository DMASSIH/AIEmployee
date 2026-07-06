import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // eslint-disable-next-line no-restricted-globals
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:dev@localhost:5432/aie',
  },
  strict: true,
  verbose: true,
});
