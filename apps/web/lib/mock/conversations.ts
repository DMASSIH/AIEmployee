/** Mock conversations — replaced by the real API in a later milestone. */

export interface MockMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  at: string;
}

export interface MockConversation {
  id: string;
  subject: string;
  contact: string;
  employee: string;
  channel: 'Email' | 'Widget' | 'API';
  status: 'open' | 'resolved' | 'escalated';
  pinned: boolean;
  favorite: boolean;
  updatedAt: string;
  preview: string;
  messages: MockMessage[];
}

export const conversations: MockConversation[] = [
  {
    id: 'conv_4871',
    subject: 'Where is my order #A-58821?',
    contact: 'Hanna Ekström',
    employee: 'Maya',
    channel: 'Email',
    status: 'resolved',
    pinned: true,
    favorite: false,
    updatedAt: '2026-07-19T08:41:00Z',
    preview: 'Your order left our Malmö warehouse yesterday and…',
    messages: [
      { id: 'm1', role: 'user', content: 'Hi, I ordered two weeks ago (order #A-58821) and still nothing. Can you check what is going on?', at: '2026-07-19T08:32:00Z' },
      { id: 'm2', role: 'assistant', content: 'Hi Hanna, thanks for your patience — I checked with the carrier. Your order left our Malmö warehouse yesterday and is due for delivery on **Tuesday, July 21**. You can follow it live here: `PN-4471-SE`. Anything else I can help with?', at: '2026-07-19T08:33:00Z' },
      { id: 'm3', role: 'user', content: 'Perfect, thank you!', at: '2026-07-19T08:40:00Z' },
      { id: 'm4', role: 'assistant', content: 'You are very welcome! Have a lovely week. 💛', at: '2026-07-19T08:41:00Z' },
    ],
  },
  {
    id: 'conv_4868',
    subject: 'Refund request — damaged chair',
    contact: 'Marcus Weber',
    employee: 'Maya',
    channel: 'Email',
    status: 'escalated',
    pinned: false,
    favorite: true,
    updatedAt: '2026-07-19T07:58:00Z',
    preview: 'I have escalated this to a colleague because the amount…',
    messages: [
      { id: 'm1', role: 'user', content: 'The chair arrived with a cracked frame. I want a full refund of $620.', at: '2026-07-19T07:41:00Z' },
      { id: 'm2', role: 'assistant', content: "I'm so sorry about the damaged chair, Marcus — that is not the experience we want you to have. Because the amount is above what I can approve directly, I have escalated this to a colleague who will confirm your refund today. You will hear from us within 4 business hours.", at: '2026-07-19T07:58:00Z' },
    ],
  },
  {
    id: 'conv_4864',
    subject: 'Pricing for 25 seats',
    contact: 'Priya Raman',
    employee: 'Deniz',
    channel: 'Widget',
    status: 'open',
    pinned: false,
    favorite: false,
    updatedAt: '2026-07-18T16:22:00Z',
    preview: 'For 25 seats the Growth plan works out to…',
    messages: [
      { id: 'm1', role: 'user', content: 'What would 25 seats cost on an annual plan?', at: '2026-07-18T16:15:00Z' },
      { id: 'm2', role: 'assistant', content: 'Great question! For 25 seats the **Growth** plan works out to $2,250/month billed annually (10% off monthly pricing). If you would like, I can book a 20-minute call to walk through volume discounts — would Thursday or Friday suit you?', at: '2026-07-18T16:22:00Z' },
    ],
  },
  {
    id: 'conv_4859',
    subject: 'Invoice INV-2093 missing PO number',
    contact: 'Sofia Lindqvist',
    employee: 'Sana',
    channel: 'Email',
    status: 'resolved',
    pinned: false,
    favorite: false,
    updatedAt: '2026-07-18T11:05:00Z',
    preview: 'Updated invoice attached with PO #4471-B referenced…',
    messages: [
      { id: 'm1', role: 'user', content: 'Our finance team rejected invoice INV-2093 — it is missing our PO number (4471-B). Can you reissue?', at: '2026-07-18T10:44:00Z' },
      { id: 'm2', role: 'assistant', content: 'Done! Updated invoice attached with PO **#4471-B** referenced in the header. Apologies for the extra round-trip, and thanks for flagging it so quickly.', at: '2026-07-18T11:05:00Z' },
    ],
  },
  {
    id: 'conv_4851',
    subject: 'Competitor brief: Relay AI launch',
    contact: 'Internal',
    employee: 'Leo',
    channel: 'Widget',
    status: 'open',
    pinned: false,
    favorite: true,
    updatedAt: '2026-07-17T09:12:00Z',
    preview: 'Draft brief: Relay AI announced a $40M Series B and…',
    messages: [
      { id: 'm1', role: 'user', content: 'Summarize the Relay AI launch announcement for the Monday brief.', at: '2026-07-17T09:02:00Z' },
      { id: 'm2', role: 'assistant', content: '**Draft brief:** Relay AI announced a $40M Series B and a new voice-agent product targeting mid-market support teams. Pricing undercuts us at the entry tier but has no usage-based option. Recommended positioning: lead with autonomy controls and RLS-grade tenant isolation.\n\n- Funding: $40M Series B (Index-led)\n- GA date: September 1\n- Pricing: $99/agent/month flat', at: '2026-07-17T09:12:00Z' },
    ],
  },
];

export const conversationById = (id: string): MockConversation | undefined =>
  conversations.find((c) => c.id === id);
