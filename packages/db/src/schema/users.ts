import { pgTable, uuid, text, timestamp, boolean, primaryKey, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { orgRoleEnum } from './enums';

/**
 * `users` is GLOBAL (no org_id, no RLS): one identity can belong to many orgs.
 * Tenant isolation for identity happens through `org_members`, which IS
 * RLS-protected. The API only ever reaches users via a membership row.
 *
 * `name` is the display name (surfaced as `displayName` in the auth API).
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  /** Argon2id. NULL for OAuth-only accounts. */
  passwordHash: text('password_hash'),
  /** Deactivated accounts cannot authenticate; kept separate from soft-delete. */
  isActive: boolean('is_active').notNull().default(true),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  /** TOTP secret, encrypted at the app layer before it ever reaches the DB. */
  mfaSecretEnc: text('mfa_secret_enc'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const orgMembers = pgTable(
  'org_members',
  {
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: orgRoleEnum('role').notNull().default('member'),
    invitedBy: uuid('invited_by').references(() => users.id),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.userId] }), index('org_members_user_idx').on(t.userId)],
);

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    email: text('email').notNull(),
    role: orgRoleEnum('role').notNull().default('member'),
    /** SHA-256 of the invite token. The raw token exists only in the email link. */
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('invitations_org_email_idx').on(t.orgId, t.email)],
);
