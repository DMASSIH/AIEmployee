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
- Tests (run automatically in CI — see [Testing & CI](#testing--ci-milestone-5)):
  - `pnpm --filter @aie/db test:withorg` — ORM path, pooled-connection safe. Defaults to `aie_app:dev`; override with `RLS_SMOKE_URL`.
  - `packages/db/tests/rls-isolation.sql` — cross-tenant attack suite. Run **as `aie_app`**, e.g.
    `docker compose exec -T db psql -U aie_app -d aie -f /repo/packages/db/tests/rls-isolation.sql` (or pass `RLS_TEST_URL` to `pnpm --filter @aie/db test:rls`).
- Known gotcha, already handled: on pooled connections an expired transaction-local GUC reads as `''` not NULL — policies use `NULLIF(current_setting(...), '')`.

## Testing & CI (Milestone 5)
- `pnpm test` runs the hermetic suite across the workspace via Turbo (unit + readiness logic + seed safety). No services required.
- Integration/database/security tests are opt-in and run automatically in CI, which provisions PostgreSQL + Redis service containers.
- Every push to `main` and every pull request runs `.github/workflows/ci.yml`: a fast **quality** gate (lint · typecheck · test · build) plus an **integration** gate that protects the M3 (RLS / least-privilege / seed safety) and M4 (db + redis plugins, health, readiness, shutdown) guarantees.
- Full guide — local commands, required services, and troubleshooting: **[docs/TESTING.md](docs/TESTING.md)**.

## Authentication (Milestone 6)
- Email + password auth with **Argon2id** hashing and **server-side, Redis-backed cookie sessions** (signed, HttpOnly `sid` cookie carrying only an opaque session id — no JWT).
- Endpoints: `POST /v1/auth/register`, `POST /v1/auth/login`, `POST /v1/auth/logout`, `GET /v1/me` (protected via the `app.authenticate` preHandler).
- Generic `401` on bad credentials (no user enumeration), one argon2 verify per login (timing-safe), stricter per-route rate limits, zod-validated bodies. Password hashes are never returned.
- Full guide — architecture, env vars, flow, endpoints, local testing: **[docs/AUTH.md](docs/AUTH.md)**.

## Organizations & multi-tenancy (Milestone 7)
- Authenticated users create and belong to organizations; the session carries an **active organization** (`POST /v1/organizations/switch`), and `app.requireOrg` verifies membership on every org-scoped request.
- Endpoints: `POST /v1/organizations` (creator becomes **owner**), `GET /v1/organizations`, `GET /v1/organizations/current`, `POST /v1/organizations/switch`.
- Integrates with M3 RLS: cross-org membership reads use SELECT-only policies keyed on `app.current_user_id` (`withUser` in `@aie/db`); all writes still require the org context (`withOrg`). Client org ids are never trusted without a DB membership check.
- Full guide: **[docs/ORGS.md](docs/ORGS.md)**.

## AI Employees (Milestone 8)
- Production backend for AI Employees — full CRUD, prompt versioning, model config, publish/draft, soft-delete/restore, and duplicate — all tenant-isolated by RLS (`withOrg`). The M7.5 UI is wired to it; no mock employee data remains.
- Endpoints under `/v1/employees` (list/search/filter/paginate, create, update, delete/restore, duplicate, publish/unpublish, prompt versions + activate, recompile, preview). Reads require org membership; writes require `owner`/`admin`/`manager`.
- Deterministic JD → system-prompt compiler writes `prompt_versions` with exactly one active version; plan limits (`PLANS.maxEmployees`, incl. `enterprise`) enforced on create. Mutations emit append-only `audit_logs`.
- Full guide: **[docs/EMPLOYEES.md](docs/EMPLOYEES.md)**.

## Knowledge Base & RAG (Milestone 9)
- Complete knowledge + retrieval layer (no LLM generation yet): collections + documents CRUD, file upload (PDF/DOCX/TXT/MD), a BullMQ **ingest** pipeline (extract → chunk → embed), pgvector similarity search, and a citation-annotated, token-budgeted RAG context builder — all tenant-isolated by RLS.
- **Provider-agnostic embeddings**: `EMBEDDING_PROVIDER=local` (deterministic, offline, default) or `openai`. Nothing outside `@aie/knowledge/embeddings` depends on a specific provider.
- New shared package **`@aie/knowledge`** (extraction registry, chunker, storage, pipeline, retrieval) is reusable by the workers, the API, and the future conversation runtime. Uploads land in MinIO/S3; processing runs in `apps/workers`.
- Endpoints under `/v1/knowledge` (collections, documents upload/manual/retry/delete, `retrieve`). Full guide: **[docs/KNOWLEDGE.md](docs/KNOWLEDGE.md)**.
