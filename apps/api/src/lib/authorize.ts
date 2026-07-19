import type { OrgRole } from '@aie/core';

/**
 * Roles allowed to create/modify org resources. `member` and `billing` are
 * read-only for product data (they can view employees but not change them).
 * Keep this list here so every module gates writes the same way.
 */
export const WRITE_ROLES: readonly OrgRole[] = ['owner', 'admin', 'manager'];

export function canWrite(role: OrgRole | undefined): boolean {
  return !!role && WRITE_ROLES.includes(role);
}
