-- Run ONCE per environment as a superuser:
--   psql -v app_password='<strong-password>' -f provision-app-role.sql
-- The application must connect as this role for RLS to be enforced
-- (superusers bypass RLS entirely; FORCE covers owners, not superusers).
-- NOTE: psql variables don't interpolate inside DO $$ blocks — hence \gexec.
SELECT format('CREATE ROLE aie_app LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aie_app')
\gexec

GRANT USAGE ON SCHEMA public TO aie_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aie_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aie_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aie_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO aie_app;

-- The app role must never touch the migrations journal.
REVOKE ALL ON ALL TABLES IN SCHEMA drizzle FROM aie_app;
