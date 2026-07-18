import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id with OWASP-recommended parameters (2024): 19 MiB, t=2, p=1.
 * `@node-rs/argon2` defaults to Argon2id, so the algorithm is left implicit
 * (its `Algorithm` const enum can't be read under `verbatimModuleSyntax`).
 * Cost parameters are encoded into the hash string, so verification reads them
 * back automatically — callers never pass them to `verifyPassword`.
 */
const HASH_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, HASH_OPTIONS);
}

/** Constant-time comparison (argon2 verifies internally in constant time). */
export function verifyPassword(hashString: string, plain: string): Promise<boolean> {
  return verify(hashString, plain);
}
