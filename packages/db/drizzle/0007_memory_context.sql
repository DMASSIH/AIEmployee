CREATE TYPE "public"."memory_type" AS ENUM('semantic', 'episodic');--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"employee_id" uuid,
	"type" "memory_type" NOT NULL,
	"content" text NOT NULL,
	"importance" smallint DEFAULT 3 NOT NULL,
	"access_count" integer DEFAULT 0 NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"embedding" vector(1536),
	"embedding_model" text,
	"source_conversation_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_source_conversation_id_conversations_id_fk" FOREIGN KEY ("source_conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memories_org_scope_idx" ON "memories" USING btree ("org_id","employee_id","type");--> statement-breakpoint
CREATE INDEX "memories_org_source_idx" ON "memories" USING btree ("org_id","source_conversation_id");--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- RLS for the new tenant table (mirrors the 0001 tenant_isolation policy).
-- HNSW index on the embedding for fast cosine retrieval at scale.
-- ---------------------------------------------------------------------------
ALTER TABLE "memories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "memories" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY tenant_isolation ON "memories"
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX memories_embedding_hnsw ON "memories" USING hnsw (embedding vector_cosine_ops);
