# AI Employees (Milestone 8)

Production backend for AI Employees — full CRUD, prompt versioning, model
configuration, and lifecycle management, all tenant-isolated by RLS. The M7.5
UI is wired to this API; there is no more mock employee data.

## Architecture

Follows the established module pattern (`apps/api/src/modules/employees/`):

| Layer | File | Responsibility |
|---|---|---|
| Controllers | `routes.ts` | HTTP + Zod schemas, auth/role preHandlers, status mapping |
| Service | `service.ts` | Business logic: plan limits, slug resolution, prompt compiling, audit, view mapping |
| Repository | `repository.ts` | Data access — every function runs on a `withOrg` `Tx`, so RLS scopes it to the tenant |
| Prompt compiler | `prompt-compiler.ts` | Deterministic JD → system prompt + template-variable validation |

Shared helpers: `lib/authorize.ts` (write-role gate) and `lib/audit.ts`
(append-only audit writes inside the same transaction as the mutation).

**Tenant isolation.** Every query goes through `withOrg(db, orgId, fn)`. RLS
means a row from another org is simply invisible — cross-org access returns 404
without a separate ownership check. Verified by `apps/api/test/employees.test.ts`
running as the non-superuser `aie_app` role.

**Authorization.** All routes require `[authenticate, requireOrg]`. Writes
additionally require `owner`, `admin`, or `manager` (`member`/`billing` are
read-only). See `WRITE_ROLES` in `lib/authorize.ts`.

## Data model

Extends the M2 `employees` + `prompt_versions` tables (migration `0004`):

- `employees`: added `slug` (unique per org), `visibility` (`draft` | `published`),
  `welcome_message`, `updated_at`. `model` / `temperature` / `maxTokens` live in
  the existing `model_config` jsonb, validated by `ModelConfig` in `@aie/core`.
- `prompt_versions`: the versioned system prompt. Exactly one active version per
  employee (`prompt_versions_one_active_uq`); the employee's current
  `systemPrompt` is the active version's compiled text.
- **Soft delete** via `deleted_at`: `DELETE` sets it, `POST /restore` clears it.
  Reads exclude deleted rows unless `includeDeleted=true`.

Plan limits (`PLANS.maxEmployees`, incl. the new `enterprise` tier) are enforced
on create/duplicate.

## Endpoints (`/v1`)

| Method | Path | Notes |
|---|---|---|
| GET | `/employees` | List — `q`, `status`, `visibility`, `sort`, `order`, `page`, `pageSize`, `includeDeleted` |
| POST | `/employees` | Create (compiles active prompt v1) · 402 on plan limit · 409 on slug clash |
| GET | `/employees/:id` | Single employee (404 if deleted) |
| PATCH | `/employees/:id` | Partial update (fields + model config) |
| DELETE | `/employees/:id` | Soft delete (204) |
| POST | `/employees/:id/restore` | Undelete |
| POST | `/employees/:id/duplicate` | Copy employee + active prompt |
| POST | `/employees/:id/publish` · `/unpublish` | Toggle `visibility` |
| GET | `/employees/:id/versions` | Prompt version history |
| POST | `/employees/:id/versions` | Save a new version (`activate` default true) |
| POST | `/employees/:id/versions/:versionId/activate` | Roll back / activate |
| POST | `/employees/:id/recompile` | Recompile active prompt from the JD |
| POST | `/employees/prompt/preview` | Compile + validate without saving |

## Frontend

`apps/web/hooks/use-employees.ts` (React Query) over `api.employees.*` in
`lib/api.ts`. Wired pages: employees list (search/filter), hire wizard (create),
detail overview, prompt editor + configuration, and version history. The
knowledge/memory/tools/analytics/conversations tabs remain placeholders for
their own milestones (M9+).

## Testing

- `apps/api/test/prompt-compiler.test.ts` — hermetic unit test (always runs).
- `apps/api/test/employees.test.ts` — full CRUD + prompt versions + org
  isolation against real Postgres + Redis as `aie_app`. Opt-in (`INTEGRATION=1`),
  runs automatically in CI.
