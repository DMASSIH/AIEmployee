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
