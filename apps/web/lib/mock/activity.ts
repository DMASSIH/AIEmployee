/** Dashboard activity + notifications mock data. */

export interface Activity {
  id: string;
  actor: string;
  action: string;
  detail: string;
  at: string;
  tone: 'default' | 'accent' | 'success' | 'danger';
}

export const recentActivity: Activity[] = [
  { id: 'act_1', actor: 'Maya', action: 'resolved a conversation', detail: '"Where is my order #A-58821?" · Email', at: '2026-07-19T08:41:00Z', tone: 'success' },
  { id: 'act_2', actor: 'Maya', action: 'escalated a refund', detail: '$620 damaged chair — above autonomous limit', at: '2026-07-19T07:58:00Z', tone: 'danger' },
  { id: 'act_3', actor: 'Jonas Lind', action: 'uploaded a document', detail: 'Product catalog 2026 · processing', at: '2026-07-19T08:10:00Z', tone: 'accent' },
  { id: 'act_4', actor: 'Deniz', action: 'drafted a reply', detail: 'Pricing for 25 seats — awaiting approval', at: '2026-07-18T16:22:00Z', tone: 'default' },
  { id: 'act_5', actor: 'Ellen Berg', action: 'activated prompt v12', detail: 'Maya · tightened refund policy wording', at: '2026-07-14T10:12:00Z', tone: 'accent' },
];

export interface Notification {
  id: string;
  title: string;
  body: string;
  at: string;
  unread: boolean;
}

export const notifications: Notification[] = [
  { id: 'not_1', title: 'Draft awaiting approval', body: 'Deniz drafted a reply to Priya Raman (25-seat pricing).', at: '2026-07-18T16:22:00Z', unread: true },
  { id: 'not_2', title: 'Escalation', body: 'Maya escalated a $620 refund on conversation #4868.', at: '2026-07-19T07:58:00Z', unread: true },
  { id: 'not_3', title: 'Ingestion failed', body: 'Q3 supplier contracts.pdf could not be processed (encrypted PDF).', at: '2026-07-19T07:52:00Z', unread: false },
  { id: 'not_4', title: 'Usage at 73%', body: 'Your workspace has used 2,180 of 3,000 monthly tasks.', at: '2026-07-17T08:00:00Z', unread: false },
];
