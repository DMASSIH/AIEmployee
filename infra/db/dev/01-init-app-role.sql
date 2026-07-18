-- ============================================================================
-- DEV-ONLY provisioning for the non-superuser application role `aie_app`.
--
-- Auto-run by Postgres on a FRESH volume via /docker-entrypoint-initdb.d
-- (see docker-compose.yml). Runs as the `postgres` superuser against DB `aie`.
--
-- WHY THIS EXISTS: Row-Level Security is only enforced for NON-superuser roles
-- (FORCE covers the table owner, superusers bypass entirely). The app and the
-- tenant-isolation tests therefore connect as `aie_app`, while migrations and
-- the seed run as the `postgres` superuser (owner).
--
-- This mirrors the parametrized PRODUCTION script infra/db/provision-app-role.sql
-- but uses a fixed dev password and is written to be idempotent + safe to run
-- either BEFORE migrations (fresh volume, default privileges cover new tables)
-- or AFTER them (manual run, existing-table grants apply). PROD must NOT use
-- this file — it uses provision-app-role.sql with a strong password.
-- ============================================================================

-- 1. Login role (idempotent — CREATE ROLE errors if it already exists).
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aie_app') THEN
    CREATE ROLE aie_app LOGIN PASSWORD 'dev';
  END IF;
END $$;

-- 2. Privileges on schema `public`.
GRANT USAGE ON SCHEMA public TO aie_app;

-- Existing objects (no-op on a fresh DB; covers a manual post-migration run).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aie_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aie_app;

-- Future objects created by the migration role (`postgres`) in schema `public`.
-- ALTER DEFAULT PRIVILEGES applies to objects created by the role running this
-- statement — the same superuser that runs the migrations — so every table the
-- migrations create is automatically reachable by aie_app.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aie_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO aie_app;

-- 3. The app role must never touch the migrations journal. The `drizzle`
--    schema only exists after the first migration, so guard the REVOKE.
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.schemata WHERE schema_name = 'drizzle') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA drizzle FROM aie_app';
  END IF;
END $$;
