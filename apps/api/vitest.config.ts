import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Source uses NodeNext '.js' import specifiers that resolve to '.ts' files;
    // teach Vite to try '.ts' first so tests can import the real modules.
    extensionAlias: { '.js': ['.ts', '.js'] },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
