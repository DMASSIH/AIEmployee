# Organizations & Multi-Tenancy (Milestone 7)

Every authenticated user can create and belong to organizations; the org is the
tenant boundary that will own all future resources (AI employees, knowledge,
billing). M7 integrates directly with the M3 Row-Level Security architecture and
the M6 session system.

## Organization model

`organizations` (existing M2 table, extended): `id` (UUID), `name`, `slug`
(**unique**, lowercase/digits/hyphens), `plan` (default `trial`), `createdAt`,
**`updatedAt`** (new in 0003), plus platform fields (settings, Stripe refs,
soft-delete) reserved for later milestones.

## Membership model

`org_members` (existing M2 table, reused): composite PK `(org_id, user_id)`,
`role` (pg enum), `joined_at` (the membership's creation timestamp). M7 assigns
only **`owner`** (to the creator); `admin` and `member` are supported by the
schema and API types, and are assigned when invitations arrive in a later
milestone. Users can never insert their own membership — memberships are only
written inside the org-creation transaction (invites come later).

## Active organization

The session (Redis, M6) carries an optional `activeOrgId`:

- Creating an organization makes it the session's active org.
- `POST /v1/organizations/switch` changes it — **after verifying membership**.
- `app.requireOrg` (preHandler) resolves the active org on each request,
  re-verifies membership against the database (revocations take effect
  immediately), and exposes `request.orgId` / `request.orgRole` /
  `request.currentOrg`. Future org-scoped routes chain
  `[app.authenticate, app.requireOrg]` and then use `withOrg(request.orgId)`.

## Authorization flow

```
request → authenticate (session → userId, activeOrgId)
        → requireOrg   (membership check in DB → orgId, orgRole)   [org-scoped routes]
        → handler      (withOrg(orgId) for tenant-scoped queries)
```

Client-supplied organization ids are **never trusted**: every path goes through
`getMembership`, and non-members get the same `404` as non-existent orgs.

### RLS integration (migration `0003_orgs_multitenancy`)

The M3 `tenant_isolation` policies key on `app.current_org_id` — but "list MY
organizations" spans orgs, so 0003 adds two **SELECT-only** policies keyed on a
second transaction-local GUC, `app.current_user_id` (set via the new
`withUser(db, userId, fn)` helper in `@aie/db`):

- `member_self_read` on `org_members` — a user sees exactly their own rows.
- `member_org_read` on `organizations` — orgs visible to their members.

Writes still require the org context (`withOrg`), so these policies grant zero
write ability. Org creation itself runs under `withOrg(newOrgId)` with a
pre-generated UUID, satisfying the `WITH CHECK` as the `aie_app` role — no RLS
bypass anywhere.

## API endpoints

| Method | Path | Auth | Body | Success | Failure |
|---|---|---|---|---|---|
| POST | `/v1/organizations` | session | `{name, slug}` | `201 {id,name,slug,plan,role}` (becomes active) | `400` invalid, `409` duplicate slug |
| GET | `/v1/organizations` | session | – | `200 [{…, role}]` | `401` |
| GET | `/v1/organizations/current` | session + active org | – | `200 {…, role}` | `400` no active org, `403` membership revoked, `401` |
| POST | `/v1/organizations/switch` | session | `{organizationId}` | `200 {…, role}` | `404` not found **or** not a member, `401` |

## Local testing

```bash
docker compose up -d
pnpm db:migrate      # applies 0003 (updated_at + member read policies)

INTEGRATION=1 \
  DATABASE_URL=postgresql://aie_app:dev@localhost:5432/aie \
  REDIS_URL=redis://localhost:6379 \
  pnpm --filter @aie/api test    # includes the 10-case orgs suite
```
