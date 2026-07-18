import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    logoUrl: text('logo_url'),
    /** trial|starter|growth|scale|enterprise — validated against PLANS in @aie/core */
    plan: text('plan').notNull().default('trial'),
    /** Stripe customer lives on the org; subscription details live in `subscriptions`. */
    stripeCustomerId: text('stripe_customer_id').unique(),
    billingEmail: text('billing_email'),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('organizations_plan_idx').on(t.plan)],
);
