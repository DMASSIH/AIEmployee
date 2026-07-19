/** Mock AI employees — replaced by the real API in M8. Deterministic on purpose. */

export type EmployeeStatus = 'active' | 'onboarding' | 'paused';
export type Autonomy = 'draft_only' | 'approve_first' | 'autonomous';

export interface MockEmployee {
  id: string;
  name: string;
  roleTitle: string;
  status: EmployeeStatus;
  autonomy: Autonomy;
  model: string;
  channels: string[];
  conversations30d: number;
  successRate: number;
  avgLatencyMs: number;
  costMtd: number;
  createdAt: string;
  jobDescription: string;
  promptVersion: number;
  knowledgeSources: number;
}

export const employees: MockEmployee[] = [
  {
    id: 'emp_maya',
    name: 'Maya',
    roleTitle: 'Customer Support Lead',
    status: 'active',
    autonomy: 'autonomous',
    model: 'claude-sonnet-5',
    channels: ['Email', 'Widget'],
    conversations30d: 1284,
    successRate: 96.4,
    avgLatencyMs: 1830,
    costMtd: 214.6,
    createdAt: '2026-04-12T09:00:00Z',
    jobDescription:
      'Answers customer emails and live-chat questions about orders, refunds and shipping. Escalates anything involving legal threats, chargebacks over $500, or press inquiries to a human immediately.',
    promptVersion: 12,
    knowledgeSources: 6,
  },
  {
    id: 'emp_deniz',
    name: 'Deniz',
    roleTitle: 'Sales Assistant',
    status: 'active',
    autonomy: 'approve_first',
    model: 'claude-sonnet-5',
    channels: ['Email'],
    conversations30d: 542,
    successRate: 91.2,
    avgLatencyMs: 2140,
    costMtd: 158.2,
    createdAt: '2026-05-02T14:30:00Z',
    jobDescription:
      'Qualifies inbound leads, answers pricing questions from the public price list, and books discovery calls on the sales calendar. Drafts replies for approval before anything is sent.',
    promptVersion: 7,
    knowledgeSources: 4,
  },
  {
    id: 'emp_sana',
    name: 'Sana',
    roleTitle: 'Operations Coordinator',
    status: 'active',
    autonomy: 'approve_first',
    model: 'claude-haiku-4-5',
    channels: ['Email', 'API'],
    conversations30d: 318,
    successRate: 94.8,
    avgLatencyMs: 990,
    costMtd: 42.1,
    createdAt: '2026-05-28T11:15:00Z',
    jobDescription:
      'Tracks supplier confirmations, chases missing invoices, and keeps the weekly operations digest up to date. Never commits to payment dates without approval.',
    promptVersion: 4,
    knowledgeSources: 3,
  },
  {
    id: 'emp_leo',
    name: 'Leo',
    roleTitle: 'Research Analyst',
    status: 'onboarding',
    autonomy: 'draft_only',
    model: 'claude-opus-4-8',
    channels: ['Widget'],
    conversations30d: 36,
    successRate: 88.9,
    avgLatencyMs: 3620,
    costMtd: 19.4,
    createdAt: '2026-07-08T16:45:00Z',
    jobDescription:
      'Summarizes competitor announcements and market news into weekly briefs. Only produces drafts — nothing is published without review.',
    promptVersion: 1,
    knowledgeSources: 2,
  },
];

export const employeeById = (id: string): MockEmployee | undefined =>
  employees.find((e) => e.id === id);

export interface PromptVersion {
  version: number;
  changelog: string;
  author: string;
  createdAt: string;
  active: boolean;
}

export const promptVersions: PromptVersion[] = [
  { version: 12, changelog: 'Tightened refund policy wording; added chargeback escalation rule', author: 'Ellen Berg', createdAt: '2026-07-14T10:12:00Z', active: true },
  { version: 11, changelog: 'Added shipping-delay macros for EU carriers', author: 'Ellen Berg', createdAt: '2026-07-02T09:41:00Z', active: false },
  { version: 10, changelog: 'Persona pass: warmer greeting, shorter closings', author: 'Jonas Lind', createdAt: '2026-06-19T15:22:00Z', active: false },
  { version: 9, changelog: 'Escalation threshold lowered to $500', author: 'Ellen Berg', createdAt: '2026-06-05T08:03:00Z', active: false },
];

export const sampleSystemPrompt = `You are Maya, the Customer Support Lead at Acme Co.

## Role
Handle customer conversations about orders, refunds, shipping and account issues with warmth and precision.

## Rules
- Always look up order details in the knowledge base before answering.
- Refunds up to $500: process directly. Above $500: escalate to a human.
- Never promise delivery dates that are not confirmed by the carrier feed.
- Escalate immediately: legal threats, chargebacks, press inquiries.

## Tone
Warm, concise, professional. Use the customer's first name. One clarifying question at most before acting.`;

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
