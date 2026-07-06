-- ============================================================================
-- 0001: Row-Level Security + hardening
-- Everything the ORM can't express: RLS policies, the audit immutability
-- trigger, and the hybrid-search tsvector column.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TENANT ISOLATION (RLS)
-- The app sets `app.current_org_id` per transaction (see @aie/db withOrg).
-- FORCE means even the table owner is subject to the policy — only
-- superusers bypass, and the app never connects as one (role: aie_app).
--
-- current_setting(..., true) returns NULL when never set, but EMPTY STRING
-- after a transaction-local set_config expires on a pooled connection —
-- hence NULLIF(…, ''). Both states must mean: no rows → NULL::uuid = anything
-- is NULL → row invisible. No context = no rows, never "all rows".
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizations',
    'org_members',
    'invitations',
    'employees',
    'prompt_versions',
    'contacts',
    'conversations',
    'messages',
    'files',
    'knowledge_sources',
    'knowledge_chunks',
    'employee_knowledge',
    'subscriptions',
    'usage_counters',
    'api_keys',
    'audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);

    IF t = 'organizations' THEN
      -- organizations has no org_id column; its own id IS the tenant key.
      EXECUTE format($p$
        CREATE POLICY tenant_isolation ON %I
          USING (id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
          WITH CHECK (id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
      $p$, t);
    ELSE
      EXECUTE format($p$
        CREATE POLICY tenant_isolation ON %I
          USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
          WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
      $p$, t);
    END IF;
  END LOOP;
END $$;
--> statement-breakpoint

-- Pre-auth paths (signup, org creation, invite acceptance, login-time
-- membership lookup) run before an org context exists. They use a separate,
-- narrowly-granted role `aie_auth` in a later milestone; for now the API's
-- auth module is the only code allowed to run outside withOrg().
-- NOTE: `users` intentionally has NO RLS — it is a global identity table
-- reached only through org_members joins in app code.

-- ---------------------------------------------------------------------------
-- 2. AUDIT LOG IMMUTABILITY
-- Append-only by construction: not even a buggy code path can rewrite history.
-- ---------------------------------------------------------------------------
CREATE FUNCTION forbid_audit_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only (attempted %)', TG_OP
    USING ERRCODE = 'raise_exception';
END $$;
--> statement-breakpoint
CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION forbid_audit_mutation();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 3. HYBRID SEARCH SUPPORT
-- Generated tsvector + GIN index for the keyword leg of RRF retrieval.
-- Kept out of the Drizzle model on purpose: it's only ever touched by the
-- raw retrieval SQL, and generated columns reject direct writes anyway.
-- ---------------------------------------------------------------------------
ALTER TABLE knowledge_chunks
  ADD COLUMN content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
--> statement-breakpoint
CREATE INDEX knowledge_chunks_tsv_idx ON knowledge_chunks USING gin (content_tsv);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 4. GUARDRAIL CONSTRAINTS the ORM doesn't express
-- ---------------------------------------------------------------------------
-- Feedback is a tri-state, not a free integer.
ALTER TABLE messages
  ADD CONSTRAINT messages_feedback_range CHECK (feedback IS NULL OR feedback IN (-1, 0, 1));
--> statement-breakpoint
-- Exactly one active prompt version per employee.
CREATE UNIQUE INDEX prompt_versions_one_active_uq
  ON prompt_versions (employee_id) WHERE is_active;
--> statement-breakpoint
-- A knowledge source must know where its content comes from.
ALTER TABLE knowledge_sources
  ADD CONSTRAINT knowledge_sources_content_origin CHECK (
    (type = 'file' AND file_id IS NOT NULL)
    OR (type = 'url' AND url IS NOT NULL)
    OR type IN ('gdrive', 'notion', 'manual')
  );
