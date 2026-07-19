import { schema, type Tx } from '@aie/db';

/**
 * Append-only audit trail. Rows are immutable by a DB trigger (see migration
 * 0001), so this is insert-only by construction. Call it INSIDE the same
 * withOrg transaction as the mutation it records — the RLS WITH CHECK on
 * audit_logs (org_id = current_org_id) then admits the row as `aie_app`, and
 * the audit entry commits or rolls back atomically with the change.
 */
export interface AuditEntry {
  orgId: string;
  actorId: string | null;
  /** Dot-namespaced verb, e.g. "employee.created". */
  action: string;
  targetType?: string;
  targetId?: string;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export async function writeAudit(tx: Tx, entry: AuditEntry): Promise<void> {
  await tx.insert(schema.auditLogs).values({
    orgId: entry.orgId,
    actorType: 'user',
    actorId: entry.actorId ?? undefined,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    ip: entry.ip ?? undefined,
    userAgent: entry.userAgent ?? undefined,
    metadata: entry.metadata ?? {},
  });
}
