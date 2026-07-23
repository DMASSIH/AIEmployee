# AI Employee — Architecture Review & Milestone Roadmap

> Status of repo at time of writing: **Milestone 2 complete** (data layer with RLS).
> This document is the agreed plan. We implement **one milestone per session**, each a clean commit.
> Analysis/planning artifact — reviewed and approved before implementation begins.

## Decisions locked
- **First milestone to implement:** M3 (make RLS load-bearing + seed).
- **`enterprise` plan:** it IS a real tier. `@aie/core` `PLANS` is the single source of truth and must gain an `enterprise` entry (schema `organizations.plan` / `subscriptions.plan` already allow it). Formalized in M15; referenced by entitlement gating from M8.

---

## 1. Architecture overview

pnpm + Turborepo monorepo, TypeScript/ESM throughout, Node ≥22, pnpm 10.

```
apps/web  (Next 15) ─┐
apps/api  (Fastify 5)─┼─► @aie/core   (Zod schemas + PLANS entitlements)
apps/workers (stub) ──┘   @aie/db     (Drizzle schema + RLS + withOrg boundary)
                          @aie/ui     (design tokens + components)
                          @aie/config (shared eslint/tsconfig)

infra: docker-compose (pg+pgvector, redis, minio, mailpit) · api.Dockerfile · provision-app-role.sql
```

**Defining decision — DB-enforced multi-tenancy:** every tenant table carries `org_id`; RLS is `ENABLE` + `FORCE`d; all org-scoped access funnels through `withOrg(db, orgId, fn)` (`packages/db/src/client.ts`), which sets a transaction-local `app.current_org_id` GUC. The app is meant to connect as non-superuser `aie_app`; superusers bypass RLS. Already tested two ways (SQL attack suite + ORM smoke test). The pooled-connection gotcha (`NULLIF(current_setting(...), '')`) is handled.

**Intended data flow:** Web → API (cookie sessions, Zod-validated) → `withOrg` → Postgres; async work (ingest, agent runs, billing, sync) → Redis/BullMQ → workers. MinIO/S3 for uploads; Mailpit for email in dev.

---

## 2. Responsibility of every app and package

| Unit | Responsibility | Maturity |
|---|---|---|
| **apps/web** | Next 15 App Router dashboard; Tailwind v4 via `@aie/ui`; `standalone` output | Placeholder page |
| **apps/api** | Fastify 5 edge: helmet, CORS, cookies, rate-limit, Zod validation, `/healthz` + `/readyz`, `/v1` group; fail-fast env | Boots; no product routes, no DB wired |
| **apps/workers** | One image, many worker types (`WORKER_TYPE=agent-runner\|ingest\|sync\|billing`) consuming BullMQ | Stub (`setInterval` keepalive) |
| **packages/core** | Source of truth for domain types + Zod schemas and plan entitlements (`PLANS`) | Solid, minimal |
| **packages/db** | Drizzle schema (17 tables), pg enums, migrations, `withOrg` boundary, `createDb` pool, RLS tests | Most complete part |
| **packages/ui** | Design tokens (`theme.css`) + components (`Button`), consumed source-first | Minimal (1 component) |
| **packages/config** | Shared ESLint + TS presets | Complete |
| **infra** | `api.Dockerfile` (multi-stage prune + deploy, non-root), `provision-app-role.sql` | API-only |

---

## 3. Technical debt & architectural issues (ranked)

**🔴 Critical**
1. **Local/dev connects as superuser → RLS silently off.** `.env.example` `DATABASE_URL` uses `postgres` superuser, which bypasses RLS. `provision-app-role.sql` is never run by compose; no app code uses `aie_app`. The tenant boundary is a no-op in the running system. Fix before any org-scoped feature. *(→ M3)*
2. **No migration-vs-app role split.** Migrations need owner/superuser; app needs `aie_app`. Single `DATABASE_URL` today; need `MIGRATION_DATABASE_URL` + app `DATABASE_URL`. *(→ M3)*

**🟠 High**
3. **DB not wired into app.** Nothing calls `createDb`; `/readyz` hard-codes `pending`; no pool lifecycle/close. *(→ M4)*
4. **No test runner or CI.** RLS suites aren't automated; would regress silently. *(→ M5)*
5. **No seed data.** RLS tests assume orgs A/B + Maya/Deniz; no seed produces them. *(→ M3)*
6. **Global rate-limit is in-memory.** Won't hold across API instances; wire Redis store. *(→ M18)*

**🟡 Medium**
7. **Env drift.** `S3_*`/`SMTP_*` in `.env.example` not validated in `env.ts`; `WEB_ORIGIN` missing from `.env.example`. *(→ M3/M4, per-feature)*
8. **Plan enum drift.** `enterprise` referenced in schema but absent from `PLANS`. Resolved: add to `PLANS`. *(→ M8/M15)*
9. **No API error contract** (global handler / 404 / request-id). *(→ M16, scaffold early)*
10. **OpenAPI not generated** despite zod type provider; free typed web client. *(→ M17 tooling)*
11. **Web/workers have no Dockerfile.** *(→ M18)*
12. **Turbo `build.env`** omits `COOKIE_SECRET`/`WEB_ORIGIN` (cache correctness). *(minor)*

**Strengths to preserve:** RLS-first design + pooled-connection gotcha handled; entitlements single source of truth; append-only audit trigger (no FKs by design); hybrid-search columns modeled out of the ORM; fail-fast env; clean package boundaries.

---

## 4. Refactor-before-features shortlist
1. Make RLS load-bearing locally (superuser→`aie_app`, split migration URL) — **M3**
2. Wire `@aie/db` + real `/readyz` + graceful pool close — **M4**
3. Vitest + CI running RLS attack suite on ephemeral pgvector Postgres — **M5**
4. Seed script (folds into M3)
5. Reconcile env + plan-enum drift (alongside M3/M4; enterprise → PLANS)

---

## 5. Placeholder / TODO inventory

| # | Location | What it is |
|---|---|---|
| 1 | `apps/api/src/app.ts:44` | `/v1` group placeholder; auth/employee routes "in coming milestones" |
| 2 | `apps/api/src/routes/health.ts:8` | `/readyz` returns `db:'pending', redis:'pending'` |
| 3 | `apps/workers/src/index.ts` | Whole file is a stub; queue consumers deferred; `setInterval` keepalive |
| 4 | `apps/web/app/page.tsx:6` | Placeholder home page |
| 5 | `packages/db/src/schema/billing.ts:56` | `usage_events` table deferred to "agent milestone" |
| 6 | `packages/db/src/client.ts:31` / migration `0001` | `aie_auth` pre-auth role deferred |
| 7 | `packages/db/src/schema/organizations.ts:11` | `enterprise` plan referenced, absent from `PLANS` |
| 8 | *missing* | Seed script (tests reference Maya/Deniz + orgs A/B) |
| 9 | *missing* | CI (`.github/`) |
| 10 | *missing* | `aie_auth` role in `provision-app-role.sql` |
| 11 | *missing* | `web`/`workers` Dockerfiles |
| 12 | `apps/api/src/config/env.ts` | `S3_*`/`SMTP_*` unvalidated; `WEB_ORIGIN` missing from `.env.example` |
| 13 | `apps/api/src/app.ts:38` | per-route rate-limit overrides "come later" |

---

## 6. Milestone roadmap

Each milestone = one focused session + clean commit. **M13 and M17 are large — split as noted.**
Foundation (M3–M5) is not reordered after feature work.

### Phase A — Foundation

#### M3 — Make RLS load-bearing + seed  ← START HERE
- **Objective:** App connects as `aie_app` so RLS actually enforces locally; separate migration vs app roles; deterministic seed.
- **Files:** `docker-compose.yml`, `infra/db/provision-app-role.sql`, new `infra/db/seed.sql` or `packages/db/src/seed.ts`, `.env.example`, `packages/db/drizzle.config.ts`, `README.md`.
- **Dependencies:** none.
- **Acceptance:** Fresh `docker compose up` + migrate (owner) + seed → `test:withorg` **and** `rls-isolation.sql` both PASS with app as `aie_app`; superuser used only for migrations.
- **Risks:** compose init ordering; `ALTER DEFAULT PRIVILEGES` covering future tables; drizzle-kit privileges.

#### M4 — DB access plugin + real readiness
- **Objective:** Expose `db` to API/workers; `/readyz` pings pg+redis; graceful pool close on SIGTERM.
- **Files:** `apps/api/src/plugins/db.ts`, `plugins/redis.ts` (new), `app.ts`, `routes/health.ts`, `config/env.ts`, `apps/workers/src/index.ts`, maybe `packages/db/src/client.ts` (`close()`).
- **Dependencies:** M3.
- **Acceptance:** `/readyz` = `db:ok,redis:ok` up / 503 down; SIGTERM drains + closes pool; API boots as `aie_app`.
- **Risks:** cheap readiness check (`SELECT 1`); pool exhaustion; redis lifecycle.

#### M5 — Test + CI foundation
- **Objective:** Vitest + GitHub Actions: typecheck/lint/build + RLS attack suite on ephemeral pgvector Postgres.
- **Files:** `.github/workflows/ci.yml`, Vitest config(s), `package.json` scripts.
- **Dependencies:** M3 (seed/provisioning); can parallel M4.
- **Acceptance:** CI green on PR; RLS suite runs as `aie_app` and **fails** if a policy is dropped; env/plan drift caught.
- **Risks:** pgvector image + role provisioning in CI; startup flakiness.

### Phase B — Identity & tenancy

#### M6 — Auth core (identity + sessions)
- **Objective:** Signup/login/logout, Argon2id, signed cookie sessions, email-verification scaffold, `aie_auth` pre-auth role.
- **Files:** `apps/api/src/modules/auth/*`, `plugins/session.ts`, `infra/db/provision-app-role.sql` (+`aie_auth`), `@aie/core` auth schemas.
- **Dependencies:** M4.
- **Acceptance:** register → verify → login → `/v1/me`; Argon2id; pre-auth runs under `aie_auth`; login strictly rate-limited.
- **Risks:** session store choice; CSRF on cookie auth; pre-auth RLS path (`users` no RLS, `org_members` RLS).

#### M7 — Orgs, membership, invitations, RBAC
- **Objective:** Org creation on signup, hashed-token invites via Mailpit, acceptance, role-based authorization middleware.
- **Files:** `apps/api/src/modules/orgs/*`, `middleware/authorize.ts`, `services/email.ts`, `@aie/core` role helpers.
- **Dependencies:** M6.
- **Acceptance:** owner invites → Mailpit email → accept → membership; role checks enforced; org queries via `withOrg`.
- **Risks:** invite token expiry/security; SMTP config; role hierarchy.

### Phase C — Product core

#### M8 — Employees CRUD + prompt compiler
- **Objective:** Employee CRUD; JD→system-prompt compiler writing `prompt_versions` with exactly one active. Enforce plan limits (incl. `enterprise`).
- **Files:** `apps/api/src/modules/employees/*`, `services/prompt-compiler.ts`, `@aie/core` PLANS (add `enterprise`).
- **Dependencies:** M7.
- **Acceptance:** create validates against `PLANS.maxEmployees`; compiles v1 prompt; `prompt_versions_one_active_uq` holds; autonomy defaults respected.
- **Risks:** entitlement enforcement; concurrency on single-active index.

#### M9 — File uploads pipeline
- **Objective:** Presigned upload to MinIO/S3, server-side magic-byte sniff, virus-scan hook, `files` status machine.
- **Files:** `apps/api/src/modules/files/*`, workers scan consumer, `config/env.ts` (`S3_*`), `services/storage.ts`.
- **Dependencies:** M7 (queue infra M10 ideal; scan can be stubbed).
- **Acceptance:** presigned URL → upload → `ready`; MIME sniffed server-side; storage keys `orgs/{orgId}/…`.
- **Risks:** presign scope; MIME spoofing; scanner integration; large files.

#### M10 — Queue infrastructure (BullMQ)
- **Objective:** Real BullMQ producers/consumers; `WORKER_TYPE` routing; retry/backoff; graceful drain.
- **Files:** new `packages/queue` (or `@aie/core`), `apps/workers/src/*`, API producers.
- **Dependencies:** M4 (redis).
- **Acceptance:** API enqueues → worker processes; retries/backoff observable; SIGTERM drains in-flight.
- **Risks:** redis connection sharing; idempotency; poison messages.

#### M11 — Knowledge ingestion + embeddings
- **Objective:** Chunk sources, embed (1536-dim), populate `knowledge_chunks` (+ generated `content_tsv`), drive `ingest_status`; account `knowledge_bytes`.
- **Files:** workers ingest consumer, `services/embeddings.ts`, knowledge tables.
- **Dependencies:** M9, M10.
- **Acceptance:** upload → ingest → chunks with embeddings; source `ready`; byte usage vs `PLANS.knowledgeBytes` enforced.
- **Risks:** embedding provider/cost; chunking quality; HNSW build time.

#### M12 — Retrieval (hybrid RRF)
- **Objective:** Hybrid vector + `tsvector` search with reciprocal-rank fusion, org-scoped raw SQL.
- **Files:** `packages/db` retrieval util, API search endpoint.
- **Dependencies:** M11.
- **Acceptance:** query returns fused ranked chunks scoped to org + `employee_knowledge`; sensible relevance on seed set.
- **Risks:** RLS + raw SQL; RRF tuning; latency.

#### M13 — Agent runtime + conversations  *(SPLIT: 13a pipeline · 13b autonomy + metering)*
- **Objective:** Run employee against a message: retrieve → Claude with tool use → persist `messages` as content blocks; enforce autonomy; meter usage.
- **Files:** `apps/workers` agent-runner, API conversations/messages endpoints, `@aie/core` autonomy, `usage_counters`.
- **Dependencies:** M12, M10, M8.
- **Acceptance:** message → assistant reply persisted w/ tokens/latency; `approve_first` drafts require approval; `tasksPerMonth` enforced.
- **Risks:** largest milestone — split; tool-use safety; cost control; streaming.

### Phase D — Go-to-market surface

#### M14 — Channels (widget + email)
- **Objective:** Web chat widget + email channel (inbound/outbound via Mailpit) mapped to `conversations`/`contacts`.
- **Files:** API channel webhooks, workers, web widget.
- **Dependencies:** M13.
- **Acceptance:** inbound email → conversation → agent replies via Mailpit; widget chat end to end.
- **Risks:** inbound parsing/threading (`externalRef`); reply loops.

#### M15 — Billing (Stripe) + entitlement enforcement
- **Objective:** Checkout, webhook-driven `subscriptions`, entitlement snapshot, `usage_counters` flush + soft/hard limits, plan gating (incl. `enterprise`).
- **Files:** API billing module + webhook, workers billing/reconcile, subscriptions/usage tables, `@aie/core` PLANS.
- **Dependencies:** M8+.
- **Acceptance:** Checkout → webhook writes subscription + entitlement snapshot; limits enforced; nightly reconcile.
- **Risks:** webhook security/idempotency; grandfathering; Stripe test mode.

#### M16 — Audit logging + observability
- **Objective:** Emit `audit_logs` on mutating actions via helper; request-id, structured logging, consistent error contract, basic metrics.
- **Files:** API audit helper + hooks, `plugins/error-handler.ts`, workers.
- **Dependencies:** M6–M15 modules.
- **Acceptance:** mutating endpoints write append-only audit rows (immutability verified); uniform errors; tracing.
- **Risks:** coverage completeness; PII in logs.

#### M17 — Web dashboard build-out  *(SPLIT per feature, tracks its API milestone)*
- **Objective:** Replace placeholder: auth, org/team, hire flow, knowledge, conversations, billing pages against the API.
- **Files:** `apps/web/app/**`, `@aie/ui`, generated API client.
- **Dependencies:** matching API milestone per slice.
- **Acceptance:** browser end-to-end hire → train → chat.
- **Risks:** large — slice alongside each API milestone.

#### M18 — Production hardening & deploy
- **Objective:** Redis-backed + per-route rate limits, web/workers Dockerfiles, secrets management, IaC, monitoring, security review.
- **Files:** `infra/*`, `app.ts` (rate-limit store), new Dockerfiles.
- **Dependencies:** all.
- **Acceptance:** reproducible prod deploy with RLS via `aie_app`; distributed rate limiting; security review passes.
- **Risks:** infra scope; secret handling; multi-instance correctness.

---

## 7. Critical path
`M3 → M4 → M5` → `M6 → M7` → `M8` → `M10 → M9 → M11 → M12 → M13` → `M14/M15` (parallelizable) → `M16` → `M18`.
**M17** rides alongside its feature milestones.

## 8. Progress log
- [ ] M3 — Make RLS load-bearing + seed  ← next
- [ ] M4 — DB access plugin + readiness
- [ ] M5 — Test + CI foundation
- [ ] M6 — Auth core
- [ ] M7 — Orgs / membership / RBAC
- [x] M8 — Employees + prompt compiler
- [x] M9 — File uploads
- [x] M10 — Queue infrastructure
- [x] M11 — Knowledge ingestion + embeddings
- [x] M12 — Retrieval (hybrid RRF)
- [x] M13 — Agent runtime + conversations *(runtime + streaming; tools framework only)*
- [x] Memory & Context *(README Milestone 11)* — durable semantic/episodic memory, ranked retrieval, prompt injection, background workers; see [docs/MEMORY.md](MEMORY.md)
- [ ] M14 — Channels
- [ ] M15 — Billing + entitlements
- [ ] M16 — Audit + observability
- [ ] M17 — Web dashboard *(split)*
- [ ] M18 — Production hardening
