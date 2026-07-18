# Authentication (Milestone 6)

Email + password authentication with server-side, Redis-backed cookie sessions.
This is the foundation every later milestone builds on.

## Architecture

### Session strategy — cookie + server-side Redis session
One strategy, used consistently (no JWT). On login the API creates a session in
Redis and returns a **signed, HttpOnly cookie** containing only an opaque 256-bit
session id — never user data or a token payload. Because all state lives in Redis,
**logout is a real invalidation** (the record is deleted), and sessions have a
sliding TTL refreshed on each authenticated request.

- Cookie: name `sid`, `HttpOnly`, `SameSite=Lax`, `Path=/`, signed with
  `COOKIE_SECRET`, `Secure` in production, `maxAge = SESSION_TTL_SECONDS`.
- Redis key: `sess:<id>` → `{ userId, createdAt }`, TTL `SESSION_TTL_SECONDS`.

### Password hashing — Argon2id
`@node-rs/argon2` (prebuilt, no native build step) with OWASP 2024 parameters
(19 MiB, t=2, p=1). Verification is constant-time. Hashes are **never** returned
by any endpoint — the only user shape sent to clients is `{ id, email, displayName }`.

### Middleware
`app.authenticate` (a Fastify preHandler, from `plugins/session.ts`) reads and
unsigns the `sid` cookie, loads the session from Redis, refreshes its TTL, and
sets `request.userId`. Missing/invalid/expired session → `401`. Protected routes
opt in with `{ preHandler: app.authenticate }`.

### Request flow
```
register: POST /v1/auth/register → validate → hash (argon2id) → insert user → 201 {id,email,displayName}
login:    POST /v1/auth/login    → validate → fetch user → verify (always 1 argon2 op) → create Redis session → Set-Cookie sid → 200 {…}
request:  GET  /v1/me            → app.authenticate → load user → 200 {…} | 401
logout:   POST /v1/auth/logout   → destroy Redis session → clear cookie → 204
```

## API endpoints
| Method | Path | Auth | Body | Success | Failure |
|---|---|---|---|---|---|
| POST | `/v1/auth/register` | – | `{ email, displayName, password }` | `201 {id,email,displayName}` | `400` invalid, `409` duplicate |
| POST | `/v1/auth/login` | – | `{ email, password }` | `200 {…}` + `Set-Cookie sid` | `400` invalid, `401` bad credentials |
| GET | `/v1/me` | cookie | – | `200 {id,email,displayName}` | `401` |
| POST | `/v1/auth/logout` | – | – | `204` | – |

Security properties: generic `401` for both unknown email and wrong password;
one argon2 verify per login (decoy hash when the email is unknown) to defeat
timing enumeration; stricter per-route rate limit (10/min) on register + login;
zod validation on every request body.

## Environment variables
| Var | Required | Default | Purpose |
|---|---|---|---|
| `COOKIE_SECRET` | yes | – (min 32 chars) | Signs the session cookie |
| `SESSION_TTL_SECONDS` | no | `604800` (7d) | Redis TTL + cookie `maxAge` |
| `DATABASE_URL` | yes | – | App DB as `aie_app` (users has no RLS) |
| `REDIS_URL` | yes | – | Session storage |

## Local testing
```bash
docker compose up -d
pnpm db:migrate            # applies 0002_users_auth_fields (is_active, updated_at)

# Hermetic unit tests (password hashing, session store) run by default:
pnpm --filter @aie/api test

# Full auth flow against real services (opt-in):
INTEGRATION=1 \
  DATABASE_URL=postgresql://aie_app:dev@localhost:5432/aie \
  REDIS_URL=redis://localhost:6379 \
  pnpm --filter @aie/api test
```

Manual smoke test:
```bash
curl -sX POST localhost:3001/v1/auth/register -H 'content-type: application/json' \
  -d '{"email":"a@example.com","displayName":"Ada","password":"correct horse battery"}'
curl -sX POST localhost:3001/v1/auth/login -c cookies.txt -H 'content-type: application/json' \
  -d '{"email":"a@example.com","password":"correct horse battery"}'
curl -s localhost:3001/v1/me -b cookies.txt
curl -sX POST localhost:3001/v1/auth/logout -b cookies.txt -c cookies.txt
```
