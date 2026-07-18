import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Integration/security tests connect to real Postgres; allow headroom.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
