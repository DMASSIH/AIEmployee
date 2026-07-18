import { randomUUID } from 'node:crypto';
import { schema, withOrg, withUser, eq, and, type Db } from '@aie/db';
import type { CreateOrganizationInput, OrganizationWithRole } from '@aie/core';
import { isUniqueViolation } from '../../lib/db-errors.js';

/** The projection of an organization the API exposes. */
const orgView = {
  id: schema.organizations.id,
  name: schema.organizations.name,
  slug: schema.organizations.slug,
  plan: schema.organizations.plan,
} as const;

export type CreateOrgResult =
  | { ok: true; organization: OrganizationWithRole }
  | { ok: false; reason: 'duplicate_slug' };

/**
 * Creates the organization and the creator's `owner` membership in ONE
 * transaction. The id is generated up front so the insert can run under
 * withOrg(newOrgId): the RLS WITH CHECK (`id = app.current_org_id`) then admits
 * both rows as the non-superuser `aie_app` role — no policy bypass anywhere.
 */
export async function createOrganization(
  db: Db,
  userId: string,
  input: CreateOrganizationInput,
): Promise<CreateOrgResult> {
  const orgId = randomUUID();
  try {
    const org = await withOrg(db, orgId, async (tx) => {
      const [row] = await tx
        .insert(schema.organizations)
        .values({ id: orgId, name: input.name, slug: input.slug })
        .returning(orgView);
      await tx.insert(schema.orgMembers).values({ orgId, userId, role: 'owner' });
      return row!;
    });
    return { ok: true, organization: { ...org, role: 'owner' } };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, reason: 'duplicate_slug' };
    throw err;
  }
}

/** All organizations the user belongs to, with their role in each (stable order). */
export async function listOrganizations(db: Db, userId: string): Promise<OrganizationWithRole[]> {
  return withUser(db, userId, (tx) =>
    tx
      .select({ ...orgView, role: schema.orgMembers.role })
      .from(schema.orgMembers)
      .innerJoin(schema.organizations, eq(schema.organizations.id, schema.orgMembers.orgId))
      .where(eq(schema.orgMembers.userId, userId))
      .orderBy(schema.orgMembers.joinedAt, schema.organizations.id),
  );
}

/**
 * The user's membership view of one organization, or null when they don't
 * belong. THE membership check: client-supplied org ids are never trusted
 * without passing through here.
 */
export async function getMembership(
  db: Db,
  userId: string,
  orgId: string,
): Promise<OrganizationWithRole | null> {
  const rows = await withUser(db, userId, (tx) =>
    tx
      .select({ ...orgView, role: schema.orgMembers.role })
      .from(schema.orgMembers)
      .innerJoin(schema.organizations, eq(schema.organizations.id, schema.orgMembers.orgId))
      .where(and(eq(schema.orgMembers.userId, userId), eq(schema.orgMembers.orgId, orgId)))
      .limit(1),
  );
  return rows[0] ?? null;
}
