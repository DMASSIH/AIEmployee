/** Mock org administration data — replaced when invitations/RBAC land (M8+). */

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  lastActive: string;
}

export const members: Member[] = [
  { id: 'mem_1', name: 'Ellen Berg', email: 'ellen@thepatternagency.se', role: 'owner', joinedAt: '2026-04-10T09:00:00Z', lastActive: '2026-07-19T08:50:00Z' },
  { id: 'mem_2', name: 'Jonas Lind', email: 'jonas@thepatternagency.se', role: 'admin', joinedAt: '2026-04-18T10:30:00Z', lastActive: '2026-07-18T17:12:00Z' },
  { id: 'mem_3', name: 'Priya Raman', email: 'priya@thepatternagency.se', role: 'member', joinedAt: '2026-05-22T13:00:00Z', lastActive: '2026-07-17T11:45:00Z' },
];

export interface Invitation {
  id: string;
  email: string;
  role: 'admin' | 'member';
  invitedBy: string;
  expiresAt: string;
}

export const invitations: Invitation[] = [
  { id: 'inv_1', email: 'sofia@thepatternagency.se', role: 'member', invitedBy: 'Ellen Berg', expiresAt: '2026-07-24T00:00:00Z' },
];

export interface RoleDef {
  id: string;
  name: string;
  description: string;
  members: number;
  permissions: Record<string, boolean>;
}

export const permissionKeys = ['View employees', 'Edit employees', 'Manage knowledge', 'View analytics', 'Manage billing', 'Manage members'];

export const roles: RoleDef[] = [
  { id: 'owner', name: 'Owner', description: 'Full access, including billing and deletion', members: 1, permissions: { 'View employees': true, 'Edit employees': true, 'Manage knowledge': true, 'View analytics': true, 'Manage billing': true, 'Manage members': true } },
  { id: 'admin', name: 'Admin', description: 'Everything except billing and org deletion', members: 1, permissions: { 'View employees': true, 'Edit employees': true, 'Manage knowledge': true, 'View analytics': true, 'Manage billing': false, 'Manage members': true } },
  { id: 'member', name: 'Member', description: 'Day-to-day work with employees and conversations', members: 1, permissions: { 'View employees': true, 'Edit employees': false, 'Manage knowledge': true, 'View analytics': true, 'Manage billing': false, 'Manage members': false } },
];

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  ip: string;
  at: string;
}

export const auditLog: AuditEntry[] = [
  { id: 'aud_1', actor: 'Ellen Berg', action: 'employee.prompt_activated', target: 'Maya · v12', ip: '82.196.14.20', at: '2026-07-14T10:12:00Z' },
  { id: 'aud_2', actor: 'Maya (AI)', action: 'refund.escalated', target: 'Conversation #4868', ip: '—', at: '2026-07-19T07:58:00Z' },
  { id: 'aud_3', actor: 'Jonas Lind', action: 'knowledge.uploaded', target: 'Product catalog 2026', ip: '82.196.14.21', at: '2026-07-19T08:10:00Z' },
  { id: 'aud_4', actor: 'Ellen Berg', action: 'member.invited', target: 'sofia@thepatternagency.se', ip: '82.196.14.20', at: '2026-07-17T09:05:00Z' },
  { id: 'aud_5', actor: 'System', action: 'billing.invoice_created', target: 'INV-2107', ip: '—', at: '2026-07-01T00:02:00Z' },
];

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export const apiKeys: ApiKey[] = [
  { id: 'key_1', name: 'Production backend', prefix: 'aie_live_3f9x', scopes: ['conversations:write', 'employees:read'], lastUsedAt: '2026-07-19T08:12:00Z', createdAt: '2026-05-14T10:00:00Z' },
  { id: 'key_2', name: 'Staging', prefix: 'aie_test_8k2m', scopes: ['conversations:write'], lastUsedAt: '2026-07-11T15:40:00Z', createdAt: '2026-06-02T09:30:00Z' },
];
