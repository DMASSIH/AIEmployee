/** Mock knowledge base — replaced by the real ingestion pipeline in M9–M11. */

export interface MockDocument {
  id: string;
  name: string;
  collection: string;
  type: 'pdf' | 'url' | 'notion' | 'manual';
  sizeBytes: number;
  chunks: number;
  status: 'ready' | 'processing' | 'failed' | 'pending';
  updatedAt: string;
}

export const documents: MockDocument[] = [
  { id: 'doc_1', name: 'Customer support handbook.pdf', collection: 'Support', type: 'pdf', sizeBytes: 4_820_000, chunks: 182, status: 'ready', updatedAt: '2026-07-15T10:00:00Z' },
  { id: 'doc_2', name: 'Refund & returns policy.pdf', collection: 'Support', type: 'pdf', sizeBytes: 640_000, chunks: 24, status: 'ready', updatedAt: '2026-07-12T09:00:00Z' },
  { id: 'doc_3', name: 'acme.co/pricing', collection: 'Sales', type: 'url', sizeBytes: 120_000, chunks: 9, status: 'ready', updatedAt: '2026-07-18T06:00:00Z' },
  { id: 'doc_4', name: 'Product catalog 2026', collection: 'Sales', type: 'notion', sizeBytes: 2_310_000, chunks: 96, status: 'processing', updatedAt: '2026-07-19T08:10:00Z' },
  { id: 'doc_5', name: 'Carrier SLA reference.pdf', collection: 'Operations', type: 'pdf', sizeBytes: 1_150_000, chunks: 41, status: 'ready', updatedAt: '2026-07-01T13:30:00Z' },
  { id: 'doc_6', name: 'Escalation playbook', collection: 'Support', type: 'manual', sizeBytes: 84_000, chunks: 12, status: 'ready', updatedAt: '2026-06-25T15:45:00Z' },
  { id: 'doc_7', name: 'Q3 supplier contracts.pdf', collection: 'Operations', type: 'pdf', sizeBytes: 8_940_000, chunks: 0, status: 'failed', updatedAt: '2026-07-19T07:52:00Z' },
];

export interface MockCollection {
  id: string;
  name: string;
  documents: number;
  sizeBytes: number;
  employees: string[];
}

export const collections: MockCollection[] = [
  { id: 'col_support', name: 'Support', documents: 3, sizeBytes: 5_544_000, employees: ['Maya'] },
  { id: 'col_sales', name: 'Sales', documents: 2, sizeBytes: 2_430_000, employees: ['Deniz'] },
  { id: 'col_ops', name: 'Operations', documents: 2, sizeBytes: 10_090_000, employees: ['Sana'] },
];

export interface MockChunk {
  id: string;
  index: number;
  heading: string;
  content: string;
  tokens: number;
}

export const sampleChunks: MockChunk[] = [
  { id: 'chk_1', index: 14, heading: 'Refund policy › Timeframes', content: 'Customers may request a full refund within 30 days of delivery. Items must be unused and in original packaging. Refunds are processed to the original payment method within 5–7 business days.', tokens: 61 },
  { id: 'chk_2', index: 15, heading: 'Refund policy › Damaged items', content: 'For items that arrive damaged, do not require a return. Request photos, apologize, and issue a replacement or refund immediately. Damage claims above $500 require supervisor approval.', tokens: 54 },
  { id: 'chk_3', index: 16, heading: 'Refund policy › Exceptions', content: 'Custom-made furniture and clearance items are final sale. If a customer disputes this, escalate to a human agent rather than making exceptions.', tokens: 42 },
];

export interface QueueItem {
  id: string;
  name: string;
  stage: 'extracting' | 'chunking' | 'embedding';
  progress: number;
}

export const processingQueue: QueueItem[] = [
  { id: 'q_1', name: 'Product catalog 2026', stage: 'embedding', progress: 72 },
  { id: 'q_2', name: 'Onboarding FAQ.pdf', stage: 'chunking', progress: 31 },
];
