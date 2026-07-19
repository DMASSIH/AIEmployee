/** Mock analytics — replaced by real usage metering in later milestones. */

export interface Point {
  label: string;
  value: number;
}

const days = ['Jun 20', 'Jun 23', 'Jun 26', 'Jun 29', 'Jul 2', 'Jul 5', 'Jul 8', 'Jul 11', 'Jul 14', 'Jul 17', 'Jul 19'];

const series = (values: number[]): Point[] => days.map((label, i) => ({ label, value: values[i] ?? 0 }));

export const messagesSeries = series([310, 342, 398, 371, 428, 462, 519, 487, 553, 601, 634]);
export const conversationsSeries = series([64, 71, 82, 78, 91, 97, 112, 104, 121, 128, 134]);
export const latencySeries = series([2140, 2080, 1990, 2010, 1950, 1890, 1860, 1900, 1840, 1810, 1830]);
export const costSeries = series([9.4, 10.1, 11.8, 11.2, 12.9, 13.4, 15.2, 14.6, 16.8, 17.9, 18.4]);
export const errorSeries = series([8, 6, 9, 5, 7, 4, 6, 5, 3, 4, 3]);
export const successSeries = series([93.1, 93.8, 94.2, 94.0, 94.9, 95.3, 95.1, 95.6, 96.0, 96.2, 96.4]);

export const usageByEmployee = [
  { label: 'Maya', value: 1284, color: 'var(--color-chart-1)' },
  { label: 'Deniz', value: 542, color: 'var(--color-chart-2)' },
  { label: 'Sana', value: 318, color: 'var(--color-chart-3)' },
  { label: 'Leo', value: 36, color: 'var(--color-chart-4)' },
];

export const usageByChannel = [
  { label: 'Email', value: 1490, color: 'var(--color-chart-1)' },
  { label: 'Widget', value: 522, color: 'var(--color-chart-2)' },
  { label: 'API', value: 168, color: 'var(--color-chart-3)' },
];

export const kpis = {
  tasksMtd: 2180,
  tasksLimit: 3000,
  successRate: 96.4,
  avgLatencyMs: 1830,
  costMtd: 434.3,
  activeEmployees: 3,
  knowledgeBytes: 18_064_000,
  knowledgeLimit: 2 * 1024 ** 3,
};
