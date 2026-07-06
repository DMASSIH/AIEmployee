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
pnpm install
pnpm db:generate && pnpm db:migrate
pnpm dev                      # web :3000 · api :3001 · workers
```

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
- Tenant boundary: ALL org-scoped queries go through `withOrg(db, orgId, fn)` — sets transaction-local RLS context. The app connects as the non-superuser `aie_app` role (`infra/db/provision-app-role.sql`); superuser connections bypass RLS.
- Tests: `pnpm --filter @aie/db test:withorg` (ORM path, pooled-connection safe) and `packages/db/tests/rls-isolation.sql` (cross-tenant attack suite). Both belong in CI.
- Known gotcha, already handled: on pooled connections an expired transaction-local GUC reads as `''` not NULL — policies use `NULLIF(current_setting(...), '')`.
