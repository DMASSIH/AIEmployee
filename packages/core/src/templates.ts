/**
 * Role templates shown in the hire wizard. The single source of truth for
 * both the web UI (template picker) and the API (validating `templateId` and
 * seeding a sensible job description). `custom` is the "start from scratch"
 * option and carries no defaults.
 */
export interface EmployeeTemplate {
  id: string;
  name: string;
  /** Lucide icon name — resolved to a component on the web side. */
  icon: string;
  roleTitle: string;
  description: string;
  /** Starter job description pre-filled into the wizard (empty for custom). */
  jobDescription: string;
}

export const EMPLOYEE_TEMPLATES: readonly EmployeeTemplate[] = [
  {
    id: 'support',
    name: 'Customer Support',
    icon: 'Headset',
    roleTitle: 'Customer Support Agent',
    description: 'Answers questions about orders, refunds, and accounts.',
    jobDescription:
      'Answer customer emails and live-chat questions about orders, refunds, shipping and accounts. ' +
      'Look up order details before answering. Escalate legal threats, chargebacks, and press inquiries to a human immediately.',
  },
  {
    id: 'sales',
    name: 'Sales Assistant',
    icon: 'ShoppingBag',
    roleTitle: 'Sales Development Rep',
    description: 'Qualifies leads and books meetings.',
    jobDescription:
      'Qualify inbound leads, answer pricing questions from the public price list, and book discovery calls on the sales calendar. ' +
      'Draft replies for approval before anything is sent.',
  },
  {
    id: 'ops',
    name: 'Operations',
    icon: 'LineChart',
    roleTitle: 'Operations Coordinator',
    description: 'Tracks tasks, invoices, and confirmations.',
    jobDescription:
      'Track supplier confirmations, chase missing invoices, and keep the weekly operations digest up to date. ' +
      'Never commit to payment dates without approval.',
  },
  {
    id: 'custom',
    name: 'Start from scratch',
    icon: 'Sparkles',
    roleTitle: '',
    description: 'Define a completely custom role.',
    jobDescription: '',
  },
] as const;

const TEMPLATE_IDS = new Set(EMPLOYEE_TEMPLATES.map((t) => t.id));

/** Valid, non-"custom" template id? (custom carries no server-side meaning). */
export function isKnownTemplate(id: string | undefined | null): boolean {
  return !!id && id !== 'custom' && TEMPLATE_IDS.has(id);
}

export function getTemplate(id: string | undefined | null): EmployeeTemplate | undefined {
  if (!id) return undefined;
  return EMPLOYEE_TEMPLATES.find((t) => t.id === id);
}
