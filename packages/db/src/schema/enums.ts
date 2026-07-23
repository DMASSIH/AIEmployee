import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * State machines live here as pg enums: typo-proof at the DB level.
 * `plan` deliberately stays TEXT on organizations/subscriptions — plans
 * change with pricing experiments and adding enum values needs migrations.
 */
export const orgRoleEnum = pgEnum('org_role', ['owner', 'admin', 'manager', 'member', 'billing']);

export const employeeStatusEnum = pgEnum('employee_status', [
  'onboarding',
  'active',
  'paused',
  'archived',
]);

export const autonomyEnum = pgEnum('autonomy_level', [
  'draft_only',
  'approve_first',
  'autonomous',
]);

/**
 * Publish state of an employee, distinct from its lifecycle `status`.
 * `draft` = still being configured / not live; `published` = live and usable.
 */
export const employeeVisibilityEnum = pgEnum('employee_visibility', ['draft', 'published']);

export const conversationChannelEnum = pgEnum('conversation_channel', [
  'web',
  'widget',
  'email',
  'whatsapp',
  'voice',
  'api',
]);

export const conversationStatusEnum = pgEnum('conversation_status', [
  'open',
  'resolved',
  'escalated',
]);

export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system', 'tool']);

export const knowledgeSourceTypeEnum = pgEnum('knowledge_source_type', [
  'file',
  'url',
  'gdrive',
  'notion',
  'manual',
]);

export const ingestStatusEnum = pgEnum('ingest_status', [
  'pending',
  'processing',
  'ready',
  'failed',
]);

export const fileStatusEnum = pgEnum('file_status', ['pending', 'scanning', 'ready', 'failed']);

export const filePurposeEnum = pgEnum('file_purpose', ['knowledge', 'avatar', 'export', 'other']);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused',
]);

export const actorTypeEnum = pgEnum('actor_type', ['user', 'employee', 'system', 'api_key']);

/**
 * Long-term memory layers (Milestone 11). `working` memory is the live message
 * window and is never persisted here — only durable memories are stored.
 * `semantic` = stable facts/preferences/rules; `episodic` = summaries of past
 * conversations and notable events.
 */
export const memoryTypeEnum = pgEnum('memory_type', ['semantic', 'episodic']);
