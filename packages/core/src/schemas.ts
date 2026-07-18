import { z } from 'zod';

/** Shared request/response schemas — imported by both API (validation) and web (forms). */

export const OrgRole = z.enum(['owner', 'admin', 'manager', 'member', 'billing']);
export type OrgRole = z.infer<typeof OrgRole>;

export const Autonomy = z.enum(['draft_only', 'approve_first', 'autonomous']);
export type Autonomy = z.infer<typeof Autonomy>;

export const EmployeeStatus = z.enum(['onboarding', 'active', 'paused', 'archived']);
export type EmployeeStatus = z.infer<typeof EmployeeStatus>;

export const CreateEmployeeInput = z.object({
  name: z.string().min(1).max(60),
  roleTitle: z.string().min(1).max(120),
  jobDescription: z.string().min(20).max(10_000),
  templateId: z.string().optional(),
  autonomy: Autonomy.default('approve_first'),
});
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeInput>;

/* -------------------------------------------------------------------------- */
/* Authentication (Milestone 6)                                               */
/* -------------------------------------------------------------------------- */

/** Normalized email: trimmed + lowercased so `Foo@x` and `foo@x` never differ. */
const email = z.string().trim().toLowerCase().email().max(254);

/**
 * Password policy: length-only (NIST 800-63B — favor length, avoid forced
 * composition rules). Upper bound guards against argon2 CPU-DoS on huge inputs.
 */
const password = z.string().min(10).max(128);

export const RegisterInput = z.object({
  email,
  displayName: z.string().trim().min(1).max(80),
  password,
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const LoginInput = z.object({
  email,
  // Login only checks the supplied password against the stored hash; no policy.
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof LoginInput>;

/** The only shape of a user ever sent to clients — never includes the hash. */
export const PublicUser = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
});
export type PublicUser = z.infer<typeof PublicUser>;

/** Generic error body for auth failures (kept intentionally uninformative). */
export const ErrorResponse = z.object({ error: z.string() });
export type ErrorResponse = z.infer<typeof ErrorResponse>;

/* -------------------------------------------------------------------------- */
/* Organizations (Milestone 7)                                                */
/* -------------------------------------------------------------------------- */

/** URL-safe slug: lowercase letters/digits, single hyphens, no edges. */
export const OrgSlug = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(50)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'use lowercase letters, digits and single hyphens');

export const CreateOrganizationInput = z.object({
  name: z.string().trim().min(1).max(100),
  slug: OrgSlug,
});
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationInput>;

export const SwitchOrganizationInput = z.object({
  organizationId: z.string().uuid(),
});
export type SwitchOrganizationInput = z.infer<typeof SwitchOrganizationInput>;

/**
 * An organization as seen by one of its members. `role` reuses the full OrgRole
 * enum for serialization safety; M7 itself only ever assigns 'owner' (invites
 * arrive in a later milestone).
 */
export const OrganizationWithRole = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  plan: z.string(),
  role: OrgRole,
});
export type OrganizationWithRole = z.infer<typeof OrganizationWithRole>;
