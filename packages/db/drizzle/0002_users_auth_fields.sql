-- 0002: auth fields on the global users table (Milestone 6).
-- Additive only — `is_active` gates authentication, `updated_at` tracks writes.
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;