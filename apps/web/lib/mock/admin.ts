/** Mock platform-admin data — internal ops UI, wired to real systems later. */

export interface ServiceHealth {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latencyMs: number;
  uptime: string;
}

export const services: ServiceHealth[] = [
  { name: 'API', status: 'operational', latencyMs: 42, uptime: '99.99%' },
  { name: 'PostgreSQL', status: 'operational', latencyMs: 4, uptime: '99.99%' },
  { name: 'Redis', status: 'operational', latencyMs: 1, uptime: '100%' },
  { name: 'Agent workers', status: 'operational', latencyMs: 210, uptime: '99.97%' },
  { name: 'Ingest workers', status: 'degraded', latencyMs: 1840, uptime: '99.82%' },
  { name: 'Object storage', status: 'operational', latencyMs: 18, uptime: '99.99%' },
];

export interface QueueStat {
  name: string;
  waiting: number;
  active: number;
  failed: number;
  throughput: string;
}

export const queues: QueueStat[] = [
  { name: 'agent-runs', waiting: 3, active: 8, failed: 0, throughput: '412/hr' },
  { name: 'ingest', waiting: 12, active: 2, failed: 1, throughput: '96/hr' },
  { name: 'email-outbound', waiting: 0, active: 1, failed: 0, throughput: '238/hr' },
  { name: 'billing-reconcile', waiting: 0, active: 0, failed: 0, throughput: '1/day' },
];

export interface WorkerInfo {
  id: string;
  type: string;
  host: string;
  status: 'running' | 'draining' | 'stopped';
  jobs: number;
  startedAt: string;
}

export const workers: WorkerInfo[] = [
  { id: 'wrk_1', type: 'agent-runner', host: 'prod-worker-1', status: 'running', jobs: 6, startedAt: '2026-07-18T02:00:00Z' },
  { id: 'wrk_2', type: 'agent-runner', host: 'prod-worker-2', status: 'running', jobs: 2, startedAt: '2026-07-18T02:00:00Z' },
  { id: 'wrk_3', type: 'ingest', host: 'prod-worker-3', status: 'draining', jobs: 2, startedAt: '2026-07-15T02:00:00Z' },
];

export interface AdminOrg {
  id: string;
  name: string;
  plan: string;
  employees: number;
  tasksMtd: number;
  status: 'active' | 'trial' | 'past_due';
}

export const adminOrgs: AdminOrg[] = [
  { id: 'org_1', name: 'The Pattern Agency', plan: 'growth', employees: 4, tasksMtd: 2180, status: 'active' },
  { id: 'org_2', name: 'Nordic Supply AB', plan: 'scale', employees: 8, tasksMtd: 11240, status: 'active' },
  { id: 'org_3', name: 'Bright & Co', plan: 'trial', employees: 1, tasksMtd: 64, status: 'trial' },
  { id: 'org_4', name: 'Atlas Logistics', plan: 'starter', employees: 1, tasksMtd: 495, status: 'past_due' },
];

export interface FeatureFlag {
  key: string;
  description: string;
  enabled: boolean;
  rollout: string;
}

export const featureFlags: FeatureFlag[] = [
  { key: 'voice-channel', description: 'Voice conversations via Twilio', enabled: false, rollout: 'Off' },
  { key: 'hybrid-retrieval-v2', description: 'RRF retrieval with reranking', enabled: true, rollout: '100%' },
  { key: 'autonomous-mode', description: 'Allow fully autonomous employees', enabled: true, rollout: 'Growth+' },
  { key: 'whatsapp-channel', description: 'WhatsApp Business integration', enabled: false, rollout: 'Internal' },
];

export interface SystemLog {
  id: string;
  ts: string;
  level: 'info' | 'warn' | 'error';
  service: string;
  message: string;
}

export const systemLogs: SystemLog[] = [
  { id: 'sl_1', ts: '2026-07-19T08:44:02Z', level: 'info', service: 'api', message: 'POST /v1/organizations/switch 200 (12ms)' },
  { id: 'sl_2', ts: '2026-07-19T08:41:38Z', level: 'warn', service: 'ingest', message: 'Embedding batch retried (rate limit) — backoff 2s' },
  { id: 'sl_3', ts: '2026-07-19T08:36:15Z', level: 'info', service: 'agent-runner', message: 'Run completed conv=4871 tokens_in=1911 tokens_out=570' },
  { id: 'sl_4', ts: '2026-07-19T08:22:51Z', level: 'error', service: 'ingest', message: 'Extract failed doc=Q3 supplier contracts.pdf: encrypted PDF' },
  { id: 'sl_5', ts: '2026-07-19T08:10:44Z', level: 'info', service: 'api', message: 'POST /v1/auth/login 200 (98ms)' },
];

export const storageStats = { used: 18_064_000, quota: 2 * 1024 ** 3, objects: 1_412, buckets: 3 };
