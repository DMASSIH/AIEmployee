import { pgTable, uuid, text, timestamp, jsonb, bigint, index } from 'drizzle-orm/pg-core';
import { actorTypeEnum } from './enums';

/**
 * Append-only by construction: a DB trigger (see the rls_and_hardening
 * migration) raises on UPDATE/DELETE, so not even a buggy app path can
 * rewrite history. No FKs on purpose — audit rows must survive the deletion
 * of whatever they reference. Partitioning by month comes when volume
 * demands it; the identity PK and (org_id, created_at) index are already
 * partition-friendly.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigint('id', { mode: 'number' }).generatedAlwaysAsIdentity().primaryKey(),
    orgId: uuid('org_id').notNull(),
    actorType: actorTypeEnum('actor_type').notNull(),
    actorId: uuid('actor_id'),
    /** Dot-namespaced verbs: "employee.created", "gmail.send", "member.role_changed". */
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: uuid('target_id'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_logs_org_time_idx').on(t.orgId, t.createdAt),
    index('audit_logs_org_action_idx').on(t.orgId, t.action),
  ],
);
