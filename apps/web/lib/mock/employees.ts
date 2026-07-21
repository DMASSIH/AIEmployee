/**
 * Placeholder data for AI-employee sub-tabs whose backends arrive in later
 * milestones (memory, tools, deployment channels, logs). The employee records,
 * prompt versions, and configuration are now served by the real API (M8) — see
 * hooks/use-employees.ts.
 */

export interface MemoryEntry {
  id: string;
  kind: 'preference' | 'fact' | 'correction';
  content: string;
  source: string;
  createdAt: string;
}

export const memoryEntries: MemoryEntry[] = [
  { id: 'mem_1', kind: 'correction', content: 'Do not offer the legacy "Spring20" discount code — it was retired in May.', source: 'Feedback on conversation #4821', createdAt: '2026-07-10T12:00:00Z' },
  { id: 'mem_2', kind: 'fact', content: 'Enterprise customers have a dedicated support SLA of 4 business hours.', source: 'Added by Ellen Berg', createdAt: '2026-06-28T09:30:00Z' },
  { id: 'mem_3', kind: 'preference', content: 'Customer "Nordic Supply AB" prefers replies in Swedish.', source: 'Learned from conversation #4590', createdAt: '2026-06-14T14:20:00Z' },
];

export interface EmployeeTool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  requiresApproval: boolean;
}

export const employeeTools: EmployeeTool[] = [
  { id: 'tool_kb', name: 'Knowledge search', description: 'Semantic + keyword search over assigned knowledge sources', enabled: true, requiresApproval: false },
  { id: 'tool_orders', name: 'Order lookup', description: 'Read-only access to the order management system', enabled: true, requiresApproval: false },
  { id: 'tool_refund', name: 'Issue refund', description: 'Create a refund up to the configured limit', enabled: true, requiresApproval: true },
  { id: 'tool_email', name: 'Send email', description: 'Send replies from support@acme.co', enabled: true, requiresApproval: false },
  { id: 'tool_calendar', name: 'Book meeting', description: 'Create events on the shared sales calendar', enabled: false, requiresApproval: true },
];

export interface DeployChannel {
  id: string;
  name: string;
  detail: string;
  status: 'live' | 'paused' | 'not_configured';
}

export const deployChannels: DeployChannel[] = [
  { id: 'ch_email', name: 'Email', detail: 'support@acme.co · via forwarding', status: 'live' },
  { id: 'ch_widget', name: 'Web widget', detail: 'acme.co · 3 pages', status: 'live' },
  { id: 'ch_whatsapp', name: 'WhatsApp', detail: 'Not connected', status: 'not_configured' },
  { id: 'ch_api', name: 'API', detail: 'v1/conversations endpoint', status: 'paused' },
];

export interface LogEntry {
  id: string;
  ts: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export const employeeLogs: LogEntry[] = [
  { id: 'log_1', ts: '2026-07-19T08:41:22Z', level: 'info', message: 'Conversation #4871 resolved (channel=email, latency=1.7s, tokens=2 481)' },
  { id: 'log_2', ts: '2026-07-19T08:36:05Z', level: 'info', message: 'Tool call order_lookup succeeded for order #A-58821' },
  { id: 'log_3', ts: '2026-07-19T08:22:47Z', level: 'warn', message: 'Retrieval returned low-confidence results for query "pallet shipping insurance"' },
  { id: 'log_4', ts: '2026-07-19T07:58:13Z', level: 'info', message: 'Draft approved by ellen@thepatternagency.se (conversation #4868)' },
  { id: 'log_5', ts: '2026-07-19T07:31:44Z', level: 'error', message: 'Tool call issue_refund rejected: amount $620 exceeds autonomous limit ($500)' },
  { id: 'log_6', ts: '2026-07-19T07:12:09Z', level: 'info', message: 'Prompt version 12 activated' },
];
