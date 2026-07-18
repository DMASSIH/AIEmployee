# AI Employee

Hire, train, and manage AI employees — no code required.

## Prerequisites
- Node.js ≥ 22
- pnpm 10 (`corepack enable`)
- Docker Desktop (for local Postgres/Redis/MinIO/Mailpit)

## First run
```bash
cp .env.example .env
docker compose up -d          # postgres+pgvector, redis, minio, mailpit
                              # first boot provisions the aie_app DB role
pnpm install
pnpm db:migrate               # runs as the superuser (MIGRATION_DATABASE_URL)
pnpm db:seed                  # two demo orgs so the RLS tests have data
pnpm dev                      # web :3000 · api :3001 · workers
```

> **Already had the stack running?** The `aie_app` role is provisioned only on a
> **fresh** database volume. Reset once so RLS is enforced locally:
> ```bash
> docker compose down -v && docker compose up -d && pnpm db:migrate && pnpm db:seed
> ```

- Web: http://localhost:3000
- API health: http://localhost:3001/healthz
- Mailpit (all outbound email lands here): http://localhost:8025
- MinIO console: http://localhost:9001

## Repo layout
```
apps/web        Next.js 15 dashboard (App Router, Tailwind v4)
apps/api        Fastify 5 API (Zod-validated, cookie sessions)
apps/workers    Queue consumers (BullMQ — arriving in queue milestone)
packages/core   Shared domain types, Zod schemas, plan entitlements
packages/db     Drizzle schema + migrations (Postgres 16 + pgvector)
packages/ui     Design system (tokens + components)
packages/config TS/ESLint shared configs
infra           Dockerfiles, IaC
```

## Conventions
- Env vars are validated at boot (`apps/api/src/config/env.ts`). Add new vars there first.
- Plan entitlements live ONLY in `packages/core/src/plans.ts`.
- All tenant tables get `org_id` + RLS (enforced from the schema milestone onward).

## Database layer (Milestone 2)
- Schema: `packages/db/src/schema/` — 17 tables, pgvector embeddings (HNSW), pg enums for state machines
- Migrations: `packages/db/drizzle/` — `0000_init` (schema, self-contained incl. `CREATE EXTENSION vector`) + `0001_rls_and_hardening` (RLS policies, append-only audit trigger, tsvector hybrid-search column, guard constraints)
- Tenant boundary: ALL org-scoped queries go through `withOrg(db, orgId, fn)` — sets transaction-local RLS context. The app connects as the non-superuser `aie_app` role; superuser connections bypass RLS.
- Two connection roles: the app + tests use `DATABASE_URL` (`aie_app`); migrations + seed use `MIGRATION_DATABASE_URL` (superuser/owner). Locally, `aie_app` is auto-created by `infra/db/dev/01-init-app-role.sql` (mounted into the db container on a fresh volume). **In production**, run the parametrized `infra/db/provision-app-role.sql` once with a strong password.
- Seed: `pnpm db:seed` inserts two demo orgs (Org A → Maya, Org B → Deniz) that the isolation tests rely on. Idempotent, and refuses to run under `NODE_ENV=production` (override: `ALLOW_PROD_SEED=true`).
- Tests (both belong in CI):
  - `pnpm --filter @aie/db test:withorg` — ORM path, pooled-connection safe. Defaults to `aie_app:dev`; override with `RLS_SMOKE_URL`.
  - `packages/db/tests/rls-isolation.sql` — cross-tenant attack suite. Run **as `aie_app`**, e.g.
    `docker compose exec -T db psql -U aie_app -d aie -f /repo/packages/db/tests/rls-isolation.sql` (or pass `RLS_TEST_URL` to `pnpm --filter @aie/db test:rls`).
- Known gotcha, already handled: on pooled connections an expired transaction-local GUC reads as `''` not NULL — policies use `NULLIF(current_setting(...), '')`.
