/**
 * SINGLE SOURCE OF TRUTH for plan entitlements.
 * The API, the web UI, and the billing worker all import from here.
 * Never duplicate these numbers anywhere else.
 */
export const PLANS = {
  trial: {
    label: 'Trial',
    maxEmployees: 1,
    tasksPerMonth: 100,
    knowledgeBytes: 50 * 1024 * 1024,
    teamMembers: 2,
    autonomyLevels: ['draft_only', 'approve_first'],
  },
  starter: {
    label: 'Starter',
    maxEmployees: 1,
    tasksPerMonth: 500,
    knowledgeBytes: 100 * 1024 * 1024,
    teamMembers: 2,
    autonomyLevels: ['draft_only', 'approve_first'],
  },
  growth: {
    label: 'Growth',
    maxEmployees: 3,
    tasksPerMonth: 3_000,
    knowledgeBytes: 2 * 1024 ** 3,
    teamMembers: 10,
    autonomyLevels: ['draft_only', 'approve_first', 'autonomous'],
  },
  scale: {
    label: 'Scale',
    maxEmployees: 10,
    tasksPerMonth: 15_000,
    knowledgeBytes: 20 * 1024 ** 3,
    teamMembers: Infinity,
    autonomyLevels: ['draft_only', 'approve_first', 'autonomous'],
  },
} as const;

export type PlanId = keyof typeof PLANS;
