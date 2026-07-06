import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  bigint,
  date,
  jsonb,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { subscriptionStatusEnum } from './enums';

/**
 * Mirror of Stripe state, written ONLY by webhook handlers (never by request
 * handlers — the redirect back from Checkout is untrusted). One active
 * subscription per org.
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .unique()
      .references(() => organizations.id),
    stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
    stripePriceId: text('stripe_price_id').notNull(),
    status: subscriptionStatusEnum('status').notNull(),
    plan: text('plan').notNull(),
    interval: text('interval').notNull(), // month | year
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    /**
     * Entitlement SNAPSHOT taken from @aie/core PLANS at subscribe time.
     * Grandfathering: repricing never silently changes an existing customer.
     */
    entitlements: jsonb('entitlements').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('subscriptions_status_idx').on(t.status)],
);

/**
 * Hot-path usage counters per billing period. Incremented via Redis in the
 * request path, flushed here, reconciled nightly against usage_events
 * (usage_events arrives with the agent milestone — it's an event stream,
 * not a product table).
 */
export const usageCounters = pgTable(
  'usage_counters',
  {
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    period: date('period').notNull(), // first day of billing month
    metric: text('metric').notNull(), // tasks | tokens_in | tokens_out | voice_minutes | knowledge_bytes
    used: bigint('used', { mode: 'number' }).notNull().default(0),
    softLimit: bigint('soft_limit', { mode: 'number' }),
    hardLimit: bigint('hard_limit', { mode: 'number' }),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.period, t.metric] })],
);
