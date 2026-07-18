import { schema, eq, type Db } from '@aie/db';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { isUniqueViolation } from '../../lib/db-errors.js';

/** The public projection of a user — never carries the password hash. */
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

function toPublic(row: { id: string; email: string; name: string | null }): AuthUser {
  return { id: row.id, email: row.email, displayName: row.name ?? '' };
}

export type RegisterResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: 'duplicate' };

export async function registerUser(
  db: Db,
  input: { email: string; displayName: string; password: string },
): Promise<RegisterResult> {
  // Hash before the insert so timing is similar whether or not the email exists.
  const passwordHash = await hashPassword(input.password);
  try {
    const [row] = await db
      .insert(schema.users)
      .values({ email: input.email, name: input.displayName, passwordHash, isActive: true })
      .returning({ id: schema.users.id, email: schema.users.email, name: schema.users.name });
    return { ok: true, user: toPublic(row!) };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, reason: 'duplicate' };
    throw err;
  }
}

/**
 * Verify credentials with no user enumeration: exactly one argon2 verify runs on
 * every call (a decoy hash when the email is unknown), and all failure modes —
 * unknown email, wrong password, inactive/passwordless account — return null.
 */
export async function authenticateUser(
  db: Db,
  decoyHash: string,
  input: { email: string; password: string },
): Promise<AuthUser | null> {
  const [row] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      passwordHash: schema.users.passwordHash,
      isActive: schema.users.isActive,
    })
    .from(schema.users)
    .where(eq(schema.users.email, input.email))
    .limit(1);

  const valid = await verifyPassword(row?.passwordHash ?? decoyHash, input.password);
  if (!row || !row.passwordHash || !row.isActive || !valid) return null;

  await db
    .update(schema.users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.users.id, row.id));

  return toPublic(row);
}

export async function getUserById(db: Db, id: string): Promise<AuthUser | null> {
  const [row] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      isActive: schema.users.isActive,
    })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);

  if (!row || !row.isActive) return null;
  return toPublic(row);
}
