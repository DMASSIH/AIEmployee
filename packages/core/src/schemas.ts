import { z } from 'zod';

/** Shared request/response schemas — imported by both API (validation) and web (forms). */

export const OrgRole = z.enum(['owner', 'admin', 'manager', 'member', 'billing']);
export type OrgRole = z.infer<typeof OrgRole>;

export const Autonomy = z.enum(['draft_only', 'approve_first', 'autonomous']);
export type Autonomy = z.infer<typeof Autonomy>;

export const EmployeeStatus = z.enum(['onboarding', 'active', 'paused', 'archived']);
export type EmployeeStatus = z.infer<typeof EmployeeStatus>;

/** Publish state — draft (private, still being set up) vs published (live). */
export const EmployeeVisibility = z.enum(['draft', 'published']);
export type EmployeeVisibility = z.infer<typeof EmployeeVisibility>;

/** Selectable Claude models. Kept in sync with the platform's supported set. */
export const EmployeeModel = z.enum([
  'claude-opus-4-8',
  'claude-sonnet-5',
  'claude-haiku-4-5',
  'claude-fable-5',
]);
export type EmployeeModel = z.infer<typeof EmployeeModel>;

/**
 * Creativity presets map to a concrete temperature. Advanced users can still
 * set `temperature` directly; the preset is a friendly shortcut for the UI.
 */
export const CREATIVITY_PRESETS = {
  precise: 0.2,
  balanced: 0.7,
  creative: 1.0,
} as const;
export type CreativityPreset = keyof typeof CREATIVITY_PRESETS;

/** Anthropic temperature range is 0–1. */
const temperature = z.number().min(0).max(1);
const maxTokens = z.number().int().min(256).max(8192);

/** Model settings persisted in employees.model_config (jsonb). */
export const ModelConfig = z.object({
  model: EmployeeModel.default('claude-sonnet-5'),
  temperature: temperature.default(0.7),
  maxTokens: maxTokens.default(1024),
});
export type ModelConfig = z.infer<typeof ModelConfig>;

/** URL-safe employee handle, unique within the org. */
export const EmployeeSlug = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(50)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'use lowercase letters, digits and single hyphens');

const employeeName = z.string().trim().min(1).max(60);
const roleTitle = z.string().trim().min(1).max(120);
const jobDescription = z.string().trim().min(20).max(10_000);
const welcomeMessage = z.string().trim().max(2_000);
const systemPrompt = z.string().trim().min(1).max(20_000);

export const CreateEmployeeInput = z.object({
  name: employeeName,
  /** Optional — the server derives a unique slug from the name when omitted. */
  slug: EmployeeSlug.optional(),
  roleTitle,
  jobDescription,
  templateId: z.string().max(60).optional(),
  autonomy: Autonomy.default('approve_first'),
  avatarSeed: z.string().trim().max(120).optional(),
  welcomeMessage: welcomeMessage.optional(),
  /** Overrides the compiled prompt; when omitted it is compiled from the JD. */
  systemPrompt: systemPrompt.optional(),
  model: EmployeeModel.optional(),
  temperature: temperature.optional(),
  maxTokens: maxTokens.optional(),
});
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeInput>;

/** Every field is optional — a partial patch. At least one is required. */
export const UpdateEmployeeInput = z
  .object({
    name: employeeName,
    slug: EmployeeSlug,
    roleTitle,
    jobDescription,
    autonomy: Autonomy,
    status: EmployeeStatus,
    avatarSeed: z.string().trim().max(120).nullable(),
    welcomeMessage: welcomeMessage.nullable(),
    model: EmployeeModel,
    temperature,
    maxTokens,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'no fields to update' });
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeInput>;

/** The employee shape returned to clients. Flattens model_config + active prompt. */
export const EmployeeView = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  roleTitle: z.string(),
  description: z.string(),
  avatar: z.string().nullable(),
  status: EmployeeStatus,
  visibility: EmployeeVisibility,
  autonomy: Autonomy,
  model: EmployeeModel,
  temperature: z.number(),
  maxTokens: z.number(),
  systemPrompt: z.string().nullable(),
  welcomeMessage: z.string().nullable(),
  promptVersion: z.number().int().nullable(),
  templateId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});
export type EmployeeView = z.infer<typeof EmployeeView>;

/** A single entry in an employee's prompt version history. */
export const PromptVersionView = z.object({
  id: z.string().uuid(),
  version: z.number().int(),
  compiledPrompt: z.string(),
  changelog: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type PromptVersionView = z.infer<typeof PromptVersionView>;

export const CreatePromptVersionInput = z.object({
  systemPrompt,
  changelog: z.string().trim().max(500).optional(),
  /** Activate this version immediately (default true). */
  activate: z.boolean().default(true),
});
export type CreatePromptVersionInput = z.infer<typeof CreatePromptVersionInput>;

/** Preview a compiled prompt from a job description without saving anything. */
export const PreviewPromptInput = z.object({
  name: employeeName,
  roleTitle,
  jobDescription,
  welcomeMessage: welcomeMessage.optional(),
});
export type PreviewPromptInput = z.infer<typeof PreviewPromptInput>;

/** List/search query: search, filtering, sorting, pagination. */
export const ListEmployeesQuery = z.object({
  q: z.string().trim().max(120).optional(),
  status: EmployeeStatus.optional(),
  visibility: EmployeeVisibility.optional(),
  includeDeleted: z.coerce.boolean().default(false),
  sort: z.enum(['createdAt', 'updatedAt', 'name']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListEmployeesQuery = z.infer<typeof ListEmployeesQuery>;

export const PaginatedEmployees = z.object({
  items: z.array(EmployeeView),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type PaginatedEmployees = z.infer<typeof PaginatedEmployees>;

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
