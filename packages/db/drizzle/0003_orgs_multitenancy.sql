-- ============================================================================
-- 0003: Organizations & multi-tenancy (Milestone 7)
-- Adds updated_at to organizations, plus USER-scoped read policies so a signed
-- in user can list/verify their own memberships across orgs — something the
-- org-scoped tenant_isolation policy (app.current_org_id) cannot express.
-- ============================================================================
ALTER TABLE "organizations" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint

-- The app sets `app.current_user_id` per transaction (see @aie/db withUser).
-- Same NULLIF guard as tenant_isolation: no context = no rows, never "all rows".
--
-- SELECT-only on purpose: these policies grant zero write ability. All writes
-- (creating orgs, adding members) still require the org context via withOrg,
-- so a user can never insert their own membership into someone else's org.
CREATE POLICY member_self_read ON org_members
  FOR SELECT
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);--> statement-breakpoint

-- Organizations visible to their members (subquery runs under org_members RLS,
-- where member_self_read admits exactly the caller's own rows).
CREATE POLICY member_org_read ON organizations
  FOR SELECT
  USING (id IN (
    SELECT org_id FROM org_members
    WHERE user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  ));
