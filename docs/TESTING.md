# Testing & CI

This repo has two tiers of tests, wired into a single Turbo `test` pipeline and
enforced by GitHub Actions on every push to `main` and every pull request.

- **Hermetic tests** run by default (`pnpm test`) with **no services**.
- **Integration / database / security tests** are **opt-in** and run only when the
  required services are provided (locally via Docker, or in CI via service
  containers). They gate on `INTEGRATION=1` + connection URLs and otherwise skip.

## Test taxonomy

| Category | Location | Needs services | Runs by default |
|---|---|---|---|
| Unit | `apps/api/test/health.test.ts`, `apps/api/test/with-timeout.test.ts` | no | ✅ |
| Security (hermetic) | `packages/db/test/seed-guard.test.ts` (seed refuses in production) | no | ✅ |
| Integration | `apps/api/test/integration.test.ts` (db + redis plugins, DI, readiness, graceful shutdown) | Postgres + Redis | opt-in (`INTEGRATION=1`) |
| Security | `packages/db/test/least-privilege.test.ts` (`aie_app` cannot escalate / alter schema / disable RLS / read migrations) | Postgres (`aie_app`) | opt-in (`INTEGRATION=1`) |
| Database | `packages/db/tests/withorg-smoke.ts` (`test:withorg`) — RLS via the pooled ORM path | Postgres (`aie_app`) | run explicitly / in CI |
| Security (SQL) | `packages/db/tests/rls-isolation.sql` (`test:rls`) — cross-tenant attack suite | Postgres (`aie_app`) + `psql` | run explicitly / in CI |

## Local commands

```bash
# Hermetic suite (fast, no services) — what CI's quality gate runs:
pnpm test

# Full quality gate locally:
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

### Running the integration + security tests locally

Bring the stack up, provision the role, migrate, and seed (see the README
"First run"), then run with the opt-in flag and URLs:

```bash
docker compose up -d
pnpm db:migrate && pnpm db:seed

# Bash / macOS / Linux:
INTEGRATION=1 \
  DATABASE_URL=postgresql://aie_app:dev@localhost:5432/aie \
  REDIS_URL=redis://localhost:6379 \
  pnpm test

# PowerShell (Windows):
$env:INTEGRATION="1"; $env:DATABASE_URL="postgresql://aie_app:dev@localhost:5432/aie"; `
  $env:REDIS_URL="redis://localhost:6379"; pnpm test

# Database + SQL security suites (run as aie_app):
RLS_SMOKE_URL=postgresql://aie_app:dev@localhost:5432/aie pnpm --filter @aie/db test:withorg
docker compose exec -T db psql -U aie_app -d aie -f /repo/packages/db/tests/rls-isolation.sql
```

## Required services

| Service | Image | Used by |
|---|---|---|
| PostgreSQL + pgvector | `pgvector/pgvector:pg16` | integration, database, security tests |
| Redis | `redis:7-alpine` | integration tests (redis plugin, readiness) |

Two connection roles (see README "Database layer"):
- `DATABASE_URL` → **`aie_app`** (non-superuser, RLS enforced) — app + tests.
- `MIGRATION_DATABASE_URL` → superuser/owner — migrations, seed, role provisioning.

## CI workflow

`.github/workflows/ci.yml`, triggered on `push` to `main` and all `pull_request`s.
Setup is shared via the composite action `.github/actions/setup` (pnpm + Node 22 +
frozen install + pnpm-store & Turbo caches).

- **`quality` job** (no services): `pnpm lint` → `pnpm typecheck` → `pnpm test`
  (hermetic; integration/security auto-skip) → `pnpm build`.
- **`integration` job** (Postgres + Redis service containers): provisions the
  `aie_app` role (`infra/db/dev/01-init-app-role.sql`) → `pnpm db:migrate` →
  `pnpm db:seed` → `pnpm test` with `INTEGRATION=1` → `test:withorg` → `test:rls`.

Any failing step fails the run immediately. Runs are reproducible and depend on
no external services.

### Turbo & caching
- CI runs Turbo pipelines (`pnpm test`, `pnpm lint`, …) rather than iterating
  packages by hand, so unchanged packages are skipped and work isn't duplicated.
- `test` is `cache: false` (integration correctness depends on live service state
  that Turbo's input hashing can't see); `lint`/`typecheck`/`build` are cached.
- The `test` task declares `passThroughEnv` so connection URLs and `INTEGRATION`
  reach the test process under Turbo's strict env mode.
- Caches: the pnpm store (via `actions/setup-node` `cache: pnpm`) and the Turbo
  cache (`.turbo`, via `actions/cache`).

## Troubleshooting

- **Integration tests skip locally.** Expected without `INTEGRATION=1` and the
  service URLs. Set both (see above).
- **`test:withorg` returns 0 rows / wrong names.** The DB isn't seeded, or you
  connected as a superuser (which bypasses RLS). Run `pnpm db:seed` and connect
  as `aie_app`.
- **`aie_app` role missing / permission denied.** The role is provisioned only on
  a fresh volume locally. Reset: `docker compose down -v && docker compose up -d`,
  then `pnpm db:migrate && pnpm db:seed`. In CI it's provisioned explicitly.
- **`test:rls` fails with `psql: command not found`.** Install a PostgreSQL client,
  or run the suite through the container: `docker compose exec -T db psql ...`.
- **`CREATE EXTENSION vector` fails on migrate.** Use the `pgvector/pgvector:pg16`
  image and run migrations as the superuser (`MIGRATION_DATABASE_URL`).
- **Web build fails locally on Windows (`EPERM` symlink).** A Next.js
  `output: 'standalone'` limitation on Windows without Developer Mode; it builds
  on Linux/CI. Unrelated to the test setup.
