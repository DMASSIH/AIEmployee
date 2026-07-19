import {
  schema,
  eq,
  and,
  or,
  ilike,
  asc,
  desc,
  isNull,
  count,
  type Tx,
} from '@aie/db';
import type { ListEmployeesQuery } from '@aie/core';

/**
 * Data-access layer for employees + prompt versions. Every function takes a
 * `Tx` opened by the service via withOrg(orgId), so RLS scopes all reads and
 * writes to the current org automatically — a row from another tenant is simply
 * invisible here, which is why the service can treat "not found" as 404 without
 * a separate ownership check.
 */

const { employees, promptVersions } = schema;

export type EmployeeRow = typeof employees.$inferSelect;
export type PromptVersionRow = typeof promptVersions.$inferSelect;

/** Employee row plus the active prompt version's text + number (left joined). */
export interface EmployeeWithPrompt {
  employee: EmployeeRow;
  activePrompt: { compiledPrompt: string; version: number } | null;
}

const activePromptJoin = and(
  eq(promptVersions.employeeId, employees.id),
  eq(promptVersions.isActive, true),
);

function mapJoined(row: {
  employee: EmployeeRow;
  prompt: { compiledPrompt: string | null; version: number | null } | null;
}): EmployeeWithPrompt {
  const p = row.prompt;
  return {
    employee: row.employee,
    activePrompt:
      p && p.compiledPrompt != null && p.version != null
        ? { compiledPrompt: p.compiledPrompt, version: p.version }
        : null,
  };
}

/** Count of live (non-soft-deleted) employees — used for plan-limit checks. */
export async function countLiveEmployees(tx: Tx, orgId: string): Promise<number> {
  const [row] = await tx
    .select({ n: count() })
    .from(employees)
    .where(and(eq(employees.orgId, orgId), isNull(employees.deletedAt)));
  return row?.n ?? 0;
}

export async function slugExists(tx: Tx, orgId: string, slug: string): Promise<boolean> {
  const [row] = await tx
    .select({ id: employees.id })
    .from(employees)
    .where(and(eq(employees.orgId, orgId), eq(employees.slug, slug)))
    .limit(1);
  return !!row;
}

export async function insertEmployee(
  tx: Tx,
  values: typeof employees.$inferInsert,
): Promise<EmployeeRow> {
  const [row] = await tx.insert(employees).values(values).returning();
  return row!;
}

export async function findEmployeeById(
  tx: Tx,
  id: string,
  opts: { includeDeleted?: boolean } = {},
): Promise<EmployeeWithPrompt | null> {
  const where = opts.includeDeleted
    ? eq(employees.id, id)
    : and(eq(employees.id, id), isNull(employees.deletedAt));
  const [row] = await tx
    .select({
      employee: employees,
      prompt: { compiledPrompt: promptVersions.compiledPrompt, version: promptVersions.version },
    })
    .from(employees)
    .leftJoin(promptVersions, activePromptJoin)
    .where(where)
    .limit(1);
  return row ? mapJoined(row) : null;
}

export async function updateEmployee(
  tx: Tx,
  id: string,
  patch: Partial<typeof employees.$inferInsert>,
): Promise<EmployeeRow | null> {
  const [row] = await tx
    .update(employees)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(employees.id, id))
    .returning();
  return row ?? null;
}

export async function listEmployees(
  tx: Tx,
  orgId: string,
  query: ListEmployeesQuery,
): Promise<{ rows: EmployeeWithPrompt[]; total: number }> {
  const filters = [eq(employees.orgId, orgId)];
  if (!query.includeDeleted) filters.push(isNull(employees.deletedAt));
  if (query.status) filters.push(eq(employees.status, query.status));
  if (query.visibility) filters.push(eq(employees.visibility, query.visibility));
  if (query.q) {
    const term = `%${query.q}%`;
    filters.push(
      or(
        ilike(employees.name, term),
        ilike(employees.roleTitle, term),
        ilike(employees.slug, term),
      )!,
    );
  }
  const where = and(...filters);

  const sortCol =
    query.sort === 'name'
      ? employees.name
      : query.sort === 'updatedAt'
        ? employees.updatedAt
        : employees.createdAt;
  const orderBy = query.order === 'asc' ? asc(sortCol) : desc(sortCol);

  const [totalRow] = await tx.select({ n: count() }).from(employees).where(where);
  const total = totalRow?.n ?? 0;

  const rows = await tx
    .select({
      employee: employees,
      prompt: { compiledPrompt: promptVersions.compiledPrompt, version: promptVersions.version },
    })
    .from(employees)
    .leftJoin(promptVersions, activePromptJoin)
    .where(where)
    .orderBy(orderBy)
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  return { rows: rows.map(mapJoined), total };
}

/* -------------------------------- prompts --------------------------------- */

export async function nextPromptVersion(tx: Tx, employeeId: string): Promise<number> {
  const [row] = await tx
    .select({ version: promptVersions.version })
    .from(promptVersions)
    .where(eq(promptVersions.employeeId, employeeId))
    .orderBy(desc(promptVersions.version))
    .limit(1);
  return (row?.version ?? 0) + 1;
}

export async function listPromptVersions(
  tx: Tx,
  employeeId: string,
): Promise<PromptVersionRow[]> {
  return tx
    .select()
    .from(promptVersions)
    .where(eq(promptVersions.employeeId, employeeId))
    .orderBy(desc(promptVersions.version));
}

export async function findPromptVersion(
  tx: Tx,
  employeeId: string,
  versionId: string,
): Promise<PromptVersionRow | null> {
  const [row] = await tx
    .select()
    .from(promptVersions)
    .where(and(eq(promptVersions.employeeId, employeeId), eq(promptVersions.id, versionId)))
    .limit(1);
  return row ?? null;
}

export async function deactivatePromptVersions(tx: Tx, employeeId: string): Promise<void> {
  await tx
    .update(promptVersions)
    .set({ isActive: false })
    .where(eq(promptVersions.employeeId, employeeId));
}

export async function activatePromptVersion(
  tx: Tx,
  employeeId: string,
  versionId: string,
): Promise<void> {
  await tx
    .update(promptVersions)
    .set({ isActive: true })
    .where(and(eq(promptVersions.employeeId, employeeId), eq(promptVersions.id, versionId)));
}

export async function insertPromptVersion(
  tx: Tx,
  values: typeof promptVersions.$inferInsert,
): Promise<PromptVersionRow> {
  const [row] = await tx.insert(promptVersions).values(values).returning();
  return row!;
}
