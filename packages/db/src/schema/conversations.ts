import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  smallint,
  index,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { employees } from './employees';
import { users } from './users';
import {
  conversationChannelEnum,
  conversationStatusEnum,
  messageRoleEnum,
} from './enums';

/** End-customers the AI talks to (not platform users). */
export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    email: text('email'),
    phone: text('phone'),
    name: text('name'),
    /** External identities: { hubspot_id: "...", wa_id: "..." } */
    crmRef: jsonb('crm_ref').$type<Record<string, string>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('contacts_org_email_idx').on(t.orgId, t.email)],
);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),
    channel: conversationChannelEnum('channel').notNull(),
    /** Email thread id, WhatsApp conversation id, Twilio call sid, … */
    externalRef: text('external_ref'),
    contactId: uuid('contact_id').references(() => contacts.id),
    status: conversationStatusEnum('status').notNull().default('open'),
    /** Human-readable title (first message summary, editable). */
    title: text('title'),
    /** Rolling conversation summary for long-context management. */
    summary: text('summary'),
    /** The platform user who started this conversation (internal chats). */
    createdBy: uuid('created_by').references(() => users.id),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('conversations_org_employee_idx').on(t.orgId, t.employeeId, t.createdAt),
    index('conversations_external_ref_idx').on(t.orgId, t.externalRef),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id),
    role: messageRoleEnum('role').notNull(),
    /**
     * Content blocks, not a string: [{type:"text",...},{type:"tool_use",...}].
     * Mirrors the LLM wire format so replay/debugging is lossless.
     */
    content: jsonb('content').$type<unknown[]>().notNull(),
    model: text('model'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    latencyMs: integer('latency_ms'),
    /** -1 | 0 | 1 — thumbs feedback; feeds the memory/eval loop. */
    feedback: smallint('feedback'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('messages_conversation_idx').on(t.orgId, t.conversationId, t.createdAt)],
);
