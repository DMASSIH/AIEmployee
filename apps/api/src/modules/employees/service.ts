import { withOrg, schema, eq, type Db } from '@aie/db';
import {
  ModelConfig,
  PLANS,
  type PlanId,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
  type CreatePromptVersionInput,
  type EmployeeView,
  type PromptVersionView,
  type ListEmployeesQuery,
  type PaginatedEmployees,
  type EmployeeVisibility,
} from '@aie/core';
import { isUniqueViolation } from '../../lib/db-errors.js';
import { writeAudit } from '../../lib/audit.js';
import { compilePrompt } from './prompt-compiler.js';
import * as repo from './repository.js';
import type { EmployeeRow, EmployeeWithPrompt, PromptVersionRow } from './repository.js';

/** Everything a mutating call needs: the tenant, the actor, and request meta. */
export interface EmployeeContext {
  orgId: string;
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
}

/* --------------------------------- mapping -------------------------------- */

function resolveConfig(raw: unknown): ModelConfig {
  const parsed = ModelConfig.safeParse(raw ?? {});
  return parsed.success ? parsed.data : ModelConfig.parse({});
}

function toView(view: EmployeeWithPrompt): EmployeeView {
  const e = view.employee;
  const cfg = resolveConfig(e.modelConfig);
  return {
    id: e.id,
    organizationId: e.orgId,
    name: e.name,
    slug: e.slug,
    roleTitle: e.roleTitle,
    description: e.jobDescription,
    avatar: e.avatarSeed ?? null,
    status: e.status,
    visibility: e.visibility,
    autonomy: e.autonomy,
    model: cfg.model,
    temperature: cfg.temperature,
    maxTokens: cfg.maxTokens,
    systemPrompt: view.activePrompt?.compiledPrompt ?? null,
    welcomeMessage: e.welcomeMessage ?? null,
    promptVersion: view.activePrompt?.version ?? null,
    templateId: e.templateId ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    deletedAt: e.deletedAt ? e.deletedAt.toISOString() : null,
  };
}

function toPromptView(row: PromptVersionRow): PromptVersionView {
  return {
    id: row.id,
    version: row.version,
    compiledPrompt: row.compiledPrompt,
    changelog: row.changelog ?? null,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.length >= 2 ? base.slice(0, 50) : 'employee';
}

/** First free slug for the org, appending -2, -3 … on collision. */
async function uniqueSlug(
  tx: Parameters<Parameters<Db['transaction']>[0]>[0],
  orgId: string,
  base: string,
): Promise<string> {
  let candidate = base;
  let n = 1;
  while (await repo.slugExists(tx, orgId, candidate)) {
    n += 1;
    candidate = `${base}-${n}`.slice(0, 50);
  }
  return candidate;
}

/* ------------------------------ result types ------------------------------ */

export type CreateResult =
  | { ok: true; employee: EmployeeView }
  | { ok: false; reason: 'plan_limit'; limit: number }
  | { ok: false; reason: 'slug_taken' }
  | { ok: false; reason: 'not_found' };

/* --------------------------------- reads ---------------------------------- */

export async function listEmployeesService(
  db: Db,
  orgId: string,
  query: ListEmployeesQuery,
): Promise<PaginatedEmployees> {
  return withOrg(db, orgId, async (tx) => {
    const { rows, total } = await repo.listEmployees(tx, orgId, query);
    return { items: rows.map(toView), total, page: query.page, pageSize: query.pageSize };
  });
}

export async function getEmployeeService(
  db: Db,
  orgId: string,
  id: string,
): Promise<EmployeeView | null> {
  return withOrg(db, orgId, async (tx) => {
    // Soft-deleted employees read as "not found" here; restore uses its own path.
    const row = await repo.findEmployeeById(tx, id);
    return row ? toView(row) : null;
  });
}

/* --------------------------------- create --------------------------------- */

export async function createEmployeeService(
  db: Db,
  ctx: EmployeeContext,
  input: CreateEmployeeInput,
): Promise<CreateResult> {
  try {
    return await withOrg(db, ctx.orgId, async (tx): Promise<CreateResult> => {
      // Plan limit — count live employees against the org's plan.
      const [org] = await tx
        .select({ plan: schema.organizations.plan })
        .from(schema.organizations)
        .where(eq(schema.organizations.id, ctx.orgId))
        .limit(1);
      const limits = PLANS[(org?.plan ?? 'trial') as PlanId] ?? PLANS.trial;
      const live = await repo.countLiveEmployees(tx, ctx.orgId);
      if (live >= limits.maxEmployees) {
        return { ok: false, reason: 'plan_limit', limit: limits.maxEmployees };
      }

      // Slug: honor an explicit choice (fail if taken), else derive uniquely.
      let slug: string;
      if (input.slug) {
        if (await repo.slugExists(tx, ctx.orgId, input.slug)) {
          return { ok: false, reason: 'slug_taken' };
        }
        slug = input.slug;
      } else {
        slug = await uniqueSlug(tx, ctx.orgId, slugify(input.name));
      }

      const config = ModelConfig.parse({
        model: input.model,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
      });

      const employee = await repo.insertEmployee(tx, {
        orgId: ctx.orgId,
        name: input.name,
        slug,
        roleTitle: input.roleTitle,
        avatarSeed: input.avatarSeed,
        templateId: input.templateId,
        autonomy: input.autonomy,
        jobDescription: input.jobDescription,
        welcomeMessage: input.welcomeMessage,
        modelConfig: config,
        createdBy: ctx.userId,
      });

      // Compile (or accept) the initial system prompt as active version 1.
      const compiled =
        input.systemPrompt ??
        compilePrompt({
          name: input.name,
          roleTitle: input.roleTitle,
          jobDescription: input.jobDescription,
          welcomeMessage: input.welcomeMessage,
        });
      await repo.insertPromptVersion(tx, {
        orgId: ctx.orgId,
        employeeId: employee.id,
        version: 1,
        compiledPrompt: compiled,
        changelog: 'Initial version',
        isActive: true,
        createdBy: ctx.userId,
      });

      await audit(tx, ctx, 'employee.created', employee.id, { name: employee.name, slug });
      return {
        ok: true,
        employee: toView({ employee, activePrompt: { compiledPrompt: compiled, version: 1 } }),
      };
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, reason: 'slug_taken' };
    throw err;
  }
}

/* --------------------------------- update --------------------------------- */

export async function updateEmployeeService(
  db: Db,
  ctx: EmployeeContext,
  id: string,
  input: UpdateEmployeeInput,
): Promise<EmployeeView | null | { slugTaken: true }> {
  try {
    return await withOrg(db, ctx.orgId, async (tx) => {
      const existing = await repo.findEmployeeById(tx, id, { includeDeleted: true });
      if (!existing) return null;

      if (input.slug && input.slug !== existing.employee.slug) {
        if (await repo.slugExists(tx, ctx.orgId, input.slug)) return { slugTaken: true as const };
      }

      // Merge model settings into the existing jsonb config.
      const patch: Partial<EmployeeRow> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.slug !== undefined) patch.slug = input.slug;
      if (input.roleTitle !== undefined) patch.roleTitle = input.roleTitle;
      if (input.jobDescription !== undefined) patch.jobDescription = input.jobDescription;
      if (input.autonomy !== undefined) patch.autonomy = input.autonomy;
      if (input.status !== undefined) patch.status = input.status;
      if (input.avatarSeed !== undefined) patch.avatarSeed = input.avatarSeed;
      if (input.welcomeMessage !== undefined) patch.welcomeMessage = input.welcomeMessage;

      if (
        input.model !== undefined ||
        input.temperature !== undefined ||
        input.maxTokens !== undefined
      ) {
        const current = resolveConfig(existing.employee.modelConfig);
        patch.modelConfig = ModelConfig.parse({
          model: input.model ?? current.model,
          temperature: input.temperature ?? current.temperature,
          maxTokens: input.maxTokens ?? current.maxTokens,
        });
      }

      const updated = await repo.updateEmployee(tx, id, patch);
      if (!updated) return null;
      await audit(tx, ctx, 'employee.updated', id, { fields: Object.keys(input) });
      return toView({ employee: updated, activePrompt: existing.activePrompt });
    });
  } catch (err) {
    // A concurrent slug change can still lose the unique race — report cleanly.
    if (isUniqueViolation(err)) return { slugTaken: true as const };
    throw err;
  }
}

/* -------------------- visibility / lifecycle / delete --------------------- */

export async function setVisibilityService(
  db: Db,
  ctx: EmployeeContext,
  id: string,
  visibility: EmployeeVisibility,
): Promise<EmployeeView | null> {
  return withOrg(db, ctx.orgId, async (tx) => {
    const existing = await repo.findEmployeeById(tx, id);
    if (!existing) return null;
    // Publishing a still-onboarding employee flips it live; unpublishing pauses.
    const status =
      visibility === 'published'
        ? existing.employee.status === 'onboarding'
          ? 'active'
          : existing.employee.status
        : existing.employee.status;
    const updated = await repo.updateEmployee(tx, id, { visibility, status });
    if (!updated) return null;
    await audit(
      tx,
      ctx,
      `employee.${visibility === 'published' ? 'published' : 'unpublished'}`,
      id,
    );
    return toView({ employee: updated, activePrompt: existing.activePrompt });
  });
}

export async function deleteEmployeeService(
  db: Db,
  ctx: EmployeeContext,
  id: string,
): Promise<boolean> {
  return withOrg(db, ctx.orgId, async (tx) => {
    const existing = await repo.findEmployeeById(tx, id);
    if (!existing) return false; // already gone or never existed
    await repo.updateEmployee(tx, id, { deletedAt: new Date() });
    await audit(tx, ctx, 'employee.deleted', id);
    return true;
  });
}

export async function restoreEmployeeService(
  db: Db,
  ctx: EmployeeContext,
  id: string,
): Promise<EmployeeView | null> {
  return withOrg(db, ctx.orgId, async (tx) => {
    const existing = await repo.findEmployeeById(tx, id, { includeDeleted: true });
    if (!existing || !existing.employee.deletedAt) return null;
    const updated = await repo.updateEmployee(tx, id, { deletedAt: null });
    if (!updated) return null;
    await audit(tx, ctx, 'employee.restored', id);
    return toView({ employee: updated, activePrompt: existing.activePrompt });
  });
}

/* -------------------------------- duplicate ------------------------------- */

export async function duplicateEmployeeService(
  db: Db,
  ctx: EmployeeContext,
  id: string,
): Promise<CreateResult> {
  try {
    return await withOrg(db, ctx.orgId, async (tx): Promise<CreateResult> => {
      const src = await repo.findEmployeeById(tx, id, { includeDeleted: true });
      if (!src) return { ok: false, reason: 'not_found' };

      const [org] = await tx
        .select({ plan: schema.organizations.plan })
        .from(schema.organizations)
        .where(eq(schema.organizations.id, ctx.orgId))
        .limit(1);
      const limits = PLANS[(org?.plan ?? 'trial') as PlanId] ?? PLANS.trial;
      const live = await repo.countLiveEmployees(tx, ctx.orgId);
      if (live >= limits.maxEmployees)
        return { ok: false, reason: 'plan_limit', limit: limits.maxEmployees };

      const e = src.employee;
      const slug = await uniqueSlug(tx, ctx.orgId, `${slugify(e.name)}-copy`);
      const clone = await repo.insertEmployee(tx, {
        orgId: ctx.orgId,
        name: `${e.name} (Copy)`,
        slug,
        roleTitle: e.roleTitle,
        avatarSeed: e.avatarSeed,
        templateId: e.templateId,
        autonomy: e.autonomy,
        status: 'onboarding',
        visibility: 'draft',
        jobDescription: e.jobDescription,
        welcomeMessage: e.welcomeMessage,
        modelConfig: e.modelConfig,
        createdBy: ctx.userId,
      });

      const prompt =
        src.activePrompt?.compiledPrompt ??
        compilePrompt({
          name: clone.name,
          roleTitle: e.roleTitle,
          jobDescription: e.jobDescription,
        });
      await repo.insertPromptVersion(tx, {
        orgId: ctx.orgId,
        employeeId: clone.id,
        version: 1,
        compiledPrompt: prompt,
        changelog: `Duplicated from ${e.name}`,
        isActive: true,
        createdBy: ctx.userId,
      });

      await audit(tx, ctx, 'employee.duplicated', clone.id, { sourceId: e.id });
      return {
        ok: true,
        employee: toView({ employee: clone, activePrompt: { compiledPrompt: prompt, version: 1 } }),
      };
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, reason: 'slug_taken' };
    throw err;
  }
}

/* ------------------------------ prompt versions --------------------------- */

export async function listPromptVersionsService(
  db: Db,
  orgId: string,
  employeeId: string,
): Promise<PromptVersionView[] | null> {
  return withOrg(db, orgId, async (tx) => {
    const employee = await repo.findEmployeeById(tx, employeeId, { includeDeleted: true });
    if (!employee) return null;
    const rows = await repo.listPromptVersions(tx, employeeId);
    return rows.map(toPromptView);
  });
}

export async function createPromptVersionService(
  db: Db,
  ctx: EmployeeContext,
  employeeId: string,
  input: CreatePromptVersionInput,
): Promise<PromptVersionView | null> {
  return withOrg(db, ctx.orgId, async (tx) => {
    const employee = await repo.findEmployeeById(tx, employeeId, { includeDeleted: true });
    if (!employee) return null;
    const version = await repo.nextPromptVersion(tx, employeeId);
    if (input.activate) await repo.deactivatePromptVersions(tx, employeeId);
    const row = await repo.insertPromptVersion(tx, {
      orgId: ctx.orgId,
      employeeId,
      version,
      compiledPrompt: input.systemPrompt,
      changelog: input.changelog,
      isActive: input.activate,
      createdBy: ctx.userId,
    });
    await audit(tx, ctx, 'employee.prompt_updated', employeeId, {
      version,
      activated: input.activate,
    });
    return toPromptView(row);
  });
}

export async function activatePromptVersionService(
  db: Db,
  ctx: EmployeeContext,
  employeeId: string,
  versionId: string,
): Promise<PromptVersionView | null> {
  return withOrg(db, ctx.orgId, async (tx) => {
    const employee = await repo.findEmployeeById(tx, employeeId, { includeDeleted: true });
    if (!employee) return null;
    const target = await repo.findPromptVersion(tx, employeeId, versionId);
    if (!target) return null;
    await repo.deactivatePromptVersions(tx, employeeId);
    await repo.activatePromptVersion(tx, employeeId, versionId);
    await audit(tx, ctx, 'employee.prompt_activated', employeeId, { version: target.version });
    return toPromptView({ ...target, isActive: true });
  });
}

/** Recompile the active prompt from the employee's current job description. */
export async function recompilePromptService(
  db: Db,
  ctx: EmployeeContext,
  employeeId: string,
): Promise<PromptVersionView | null> {
  return withOrg(db, ctx.orgId, async (tx) => {
    const employee = await repo.findEmployeeById(tx, employeeId, { includeDeleted: true });
    if (!employee) return null;
    const e = employee.employee;
    const compiled = compilePrompt({
      name: e.name,
      roleTitle: e.roleTitle,
      jobDescription: e.jobDescription,
      welcomeMessage: e.welcomeMessage,
    });
    const version = await repo.nextPromptVersion(tx, employeeId);
    await repo.deactivatePromptVersions(tx, employeeId);
    const row = await repo.insertPromptVersion(tx, {
      orgId: ctx.orgId,
      employeeId,
      version,
      compiledPrompt: compiled,
      changelog: 'Recompiled from job description',
      isActive: true,
      createdBy: ctx.userId,
    });
    await audit(tx, ctx, 'employee.prompt_recompiled', employeeId, { version });
    return toPromptView(row);
  });
}

/* --------------------------------- helper --------------------------------- */

function audit(
  tx: Parameters<Parameters<Db['transaction']>[0]>[0],
  ctx: EmployeeContext,
  action: string,
  targetId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return writeAudit(tx, {
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action,
    targetType: 'employee',
    targetId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    metadata,
  });
}
