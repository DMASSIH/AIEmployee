/** Mock billing — replaced by Stripe integration in M15. */

export interface PlanDef {
  id: string;
  name: string;
  monthly: number;
  description: string;
  features: string[];
  highlight?: boolean;
}

export const plans: PlanDef[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthly: 49,
    description: 'One AI employee for a small team getting started.',
    features: ['1 AI employee', '500 tasks / month', '100 MB knowledge', '2 team members', 'Email + widget channels'],
  },
  {
    id: 'growth',
    name: 'Growth',
    monthly: 199,
    description: 'A small AI team working across your busiest channels.',
    features: ['3 AI employees', '3,000 tasks / month', '2 GB knowledge', '10 team members', 'Autonomous mode', 'API access'],
    highlight: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    monthly: 699,
    description: 'Serious volume with room for every department.',
    features: ['10 AI employees', '15,000 tasks / month', '20 GB knowledge', 'Unlimited team members', 'Priority support', 'SSO'],
  },
];

export interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: 'paid' | 'open' | 'void';
}

export const invoices: Invoice[] = [
  { id: 'inv_7', number: 'INV-2107', date: '2026-07-01T00:00:00Z', amount: 199, status: 'open' },
  { id: 'inv_6', number: 'INV-2093', date: '2026-06-01T00:00:00Z', amount: 199, status: 'paid' },
  { id: 'inv_5', number: 'INV-2079', date: '2026-05-01T00:00:00Z', amount: 199, status: 'paid' },
  { id: 'inv_4', number: 'INV-2064', date: '2026-04-01T00:00:00Z', amount: 49, status: 'paid' },
];

export const paymentMethod = { brand: 'Visa', last4: '4242', exp: '08/2028' };
