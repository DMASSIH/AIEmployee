import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Seed safety (hermetic): the guard must trip BEFORE any database connection,
 * so this runs without services. We invoke the real seed entrypoint in a child
 * process under NODE_ENV=production and assert it refuses.
 */
const pkgDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runSeed(env: Record<string, string>): { code: number; stderr: string } {
  try {
    execSync('pnpm exec tsx src/seed.ts', {
      cwd: pkgDir,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stderr: '' };
  } catch (err) {
    const e = err as { status?: number; stderr?: Buffer | string };
    return { code: e.status ?? 1, stderr: String(e.stderr ?? '') };
  }
}

describe('seed production guard', () => {
  it('refuses to run under NODE_ENV=production', () => {
    const { code, stderr } = runSeed({ NODE_ENV: 'production', ALLOW_PROD_SEED: '' });
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/refusing to run with NODE_ENV=production/i);
  });
});
