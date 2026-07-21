CREATE TABLE "knowledge_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "knowledge_collections_org_slug_uq" UNIQUE("org_id","slug")
);
--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD COLUMN "token_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD COLUMN "embedding_model" text;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD COLUMN "collection_id" uuid;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD COLUMN "mime_type" text;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_collections" ADD CONSTRAINT "knowledge_collections_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_collections" ADD CONSTRAINT "knowledge_collections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_collection_id_knowledge_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."knowledge_collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knowledge_sources_collection_idx" ON "knowledge_sources" USING btree ("org_id","collection_id");--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- RLS for the new tenant table. Mirrors the tenant_isolation policy from the
-- 0001 migration: rows are visible/writable only within the caller's org
-- context (app.current_org_id), enforced for the non-superuser aie_app role.
-- New COLUMNS on existing tables inherit those tables' existing policies.
-- ---------------------------------------------------------------------------
ALTER TABLE "knowledge_collections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "knowledge_collections" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY tenant_isolation ON "knowledge_collections"
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);
