import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';
import { employeeStatusEnum, autonomyEnum } from './enums';

export const employees = pgTable(
  'employees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    /** They get names — "Maya", "Deniz". The employment metaphor starts here. */
    name: text('name').notNull(),
    roleTitle: text('role_title').notNull(),
    /** Seed for the deterministic generated avatar. */
    avatarSeed: text('avatar_seed'),
    /** Which role template this employee was hired from (null = custom). */
    templateId: text('template_id'),
    status: employeeStatusEnum('status').notNull().default('onboarding'),
    autonomy: autonomyEnum('autonomy').notNull().default('approve_first'),
    /** The human-written job description; compiled prompts live in prompt_versions. */
    jobDescription: text('job_description').notNull(),
    modelConfig: jsonb('model_config').$type<Record<string, unknown>>().notNull().default({}),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('employees_org_status_idx').on(t.orgId, t.status)],
);

export const promptVersions = pgTable(
  'prompt_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),
    version: integer('version').notNull(),
    /** Output of the JD → system-prompt compiler (or a manual edit in advanced mode). */
    compiledPrompt: text('compiled_prompt').notNull(),
    changelog: text('changelog'),
    isActive: boolean('is_active').notNull().default(false),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('prompt_versions_employee_version_uq').on(t.employeeId, t.version),
    index('prompt_versions_active_idx').on(t.employeeId, t.isActive),
  ],
);
