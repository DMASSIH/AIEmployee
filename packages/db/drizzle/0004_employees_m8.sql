CREATE TYPE "public"."employee_visibility" AS ENUM('draft', 'published');--> statement-breakpoint
-- Add `slug` in three safe steps so existing rows (e.g. the dev seed's Maya/Deniz)
-- don't violate the NOT NULL / unique constraint on the way in.
ALTER TABLE "employees" ADD COLUMN "slug" text;--> statement-breakpoint
UPDATE "employees"
  SET "slug" = trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g'))
    || '-' || left("id"::text, 8)
  WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "visibility" "employee_visibility" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "welcome_message" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_org_slug_uq" UNIQUE("org_id","slug");