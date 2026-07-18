import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/lib/password.js';

/** Unit (hermetic): Argon2id hashing round-trips and rejects wrong inputs. */
describe('password hashing', () => {
  it('produces an argon2id hash that is not the plaintext', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain('correct horse battery staple');
  });

  it('verifies the correct password', async () => {
    const hash = await hashPassword('s3cure-passphrase');
    await expect(verifyPassword(hash, 's3cure-passphrase')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('s3cure-passphrase');
    await expect(verifyPassword(hash, 'wrong-passphrase')).resolves.toBe(false);
  });

  it('produces distinct hashes for the same password (random salt)', async () => {
    const [a, b] = await Promise.all([hashPassword('same-password'), hashPassword('same-password')]);
    expect(a).not.toBe(b);
  });
});
