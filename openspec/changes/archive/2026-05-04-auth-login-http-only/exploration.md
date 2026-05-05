## Exploration: auth-login-http-only

### Current State
- The runtime is still scaffold-only: `src/main.ts`, `src/app.module.ts`, and `src/prisma.service.ts` exist, but there is no auth module, no guards, no cookie middleware, no config validation, and no role enforcement yet.
- Prisma already contains generic auth tables from the initial migration: lowercase `user`, `account`, `session`, and `verification` in `prisma/schema.prisma` and `prisma/migrations/20260504024221_init/migration.sql`.
- The current auth schema is boilerplate-oriented rather than first-party credentials focused: `user` has `email` but no role/status fields; `account` has `providerId`, `accountId`, and `password`; `session` has `token`, `expiresAt`, `ipAddress`, and `userAgent`.
- Business context in `docs/business-context.md` says v1 is mainly for family administration, while mechanics and sales exist as business entities but do not need to be system users yet. That supports admin-first auth with role scaffolding now, while still defining `ADMIN | SALES | MECHANIC` from day one.
- Testing is still Nest starter coverage only: `src/app.controller.spec.ts` and `test/app.e2e-spec.ts`. E2E imports `AppModule`, so auth E2E will require a valid test `DATABASE_URL`, seeded auth data, and an explicit way to load the test env file.
- The repo does not yet include auth-specific runtime dependencies such as JWT, Passport, cookie parsing, or bcrypt in `package.json`.
- Test DB readiness is materially better now: a dedicated `mecanismos-dashboard-test` database exists, the current migrations were already applied there with `npx prisma migrate deploy`, and `npx prisma generate` already succeeded. The operational gotcha is that `prisma.config.ts` loads `.env` by default, so `.env.development` must be loaded explicitly when commands need to target the test DB.

### Affected Areas
- `prisma/schema.prisma` — auth models need simplification, role fields, credential storage decisions, and refresh-session rotation fields.
- `prisma/migrations/20260504024221_init/migration.sql` — baseline shows the original boilerplate auth shape that future migrations must evolve away from carefully.
- `prisma/migrations/20260504065151_add_business_domain/migration.sql` — confirms the current business-domain baseline already coexists with the boilerplate auth tables.
- `prisma.config.ts` — documents the default `.env` loading behavior that can silently point Prisma commands at the wrong database if `.env.development` is not loaded explicitly.
- `src/main.ts` — will need cookie parsing, CORS/credentials handling, and likely security middleware setup.
- `src/app.module.ts` — will need auth/user modules plus validated configuration wiring.
- `src/prisma.service.ts` — remains the DB boundary for auth/session persistence and test wiring because it reads `process.env.DATABASE_URL` directly.
- `test/app.e2e-spec.ts` — current starter E2E must expand into cookie-based auth flows backed by the dedicated test DB.
- `docs/business-context.md` — establishes admin-first reality and limits employee/user coupling.
- `docs/auth/*` — feature-package docs should explain schema simplification, security, cookie topology, and test setup.

### Approaches
1. **Simplify the existing boilerplate auth tables in place** — treat `user` / `account` / `session` as a disposable starting point, remove generic/OAuth assumptions, and reshape them around first-party email/password plus refresh rotation.
   - Pros: Lowest migration churn, keeps continuity with the current DB baseline, fastest route to admin-first login, and avoids running two auth models in parallel.
   - Cons: Requires discipline to simplify instead of preserving bad boilerplate semantics; careless reuse of names like `password` and `token` can create long-term ambiguity.
   - Effort: Medium

2. **Replace the boilerplate auth model with dedicated first-party auth tables** — introduce explicit credential/session tables and migrate away from the generic schema entirely.
   - Pros: Cleanest semantics, easier to name fields correctly from the start, and no need to explain OAuth-era leftovers later.
   - Cons: More schema churn immediately, higher migration effort, and more design work before implementation can begin.
   - Effort: High

### Recommendation
Use **Approach 1**, but do it with ZERO sentimental attachment to the boilerplate schema: keep only the parts that genuinely help and simplify the rest aggressively.

Recommended design details:
- Keep **email/password only** for v1. Do not add OAuth/social providers.
- Use **bcrypt** for password hashing because that is the user's explicit preference and familiarity choice. The important architectural point is strong one-way password hashing with controlled cost and no plaintext storage.
- Add a `UserRole` enum and start with a **single `role` field on `user`** (`ADMIN | SALES | MECHANIC`). Product focus remains `ADMIN` first, but the enum should exist from the start.
- Add `isActive` on `user`; optionally add `lastLoginAt`. Do **not** couple `user` to `Employee` yet because the business doc explicitly says employees are not necessarily login users in v1.
- Do **not** blindly preserve the current `account` table shape just because it already exists. If `account` stays, it should become a minimal credentials record, ideally with clearer naming such as `passwordHash` and without carrying unused OAuth baggage.
- Do **not** keep `verification` unless a concrete v1 feature needs it.
- Reuse `session` only if it is reshaped into a clear **refresh-session store** with rotation/revocation fields (`revokedAt`, `replacedBySessionId`, `familyId` or equivalent lineage fields). Avoid storing reusable refresh tokens in plaintext.
- Use a **short-lived access JWT** (e.g. 10-15 min) and a **longer-lived refresh token** in HttpOnly cookies, with refresh rotation on every refresh.
- Prefer **random opaque refresh tokens** stored as deterministic digests/HMACs in the database rather than slow password-style hashes; they are high-entropy secrets, and deterministic lookup makes rotation/reuse detection practical.
- Use `cookie-parser` because Nest Express does not expose parsed cookies without it.
- Use `@nestjs/config` with **schema validation** for JWT secrets, cookie settings, token TTLs, and frontend origin allowlists.
- Passport is worth keeping for the **JWT strategy/guard layer**. A local Passport strategy is optional; for a simple email/password login endpoint, a DTO + service validation flow is usually less ceremony than adding `passport-local`.

Security requirements to carry into proposal/spec/design:
- Cookies MUST be `HttpOnly`.
- `Secure=true` in production; local development on plain `http://localhost` may require `Secure=false` only for local dev.
- Likely production topology is `mecanismos-tecnicos.com` for frontend and `api.mecanismos-tecnicos.com` for backend. Those are different origins but still typically the **same site** under the same registrable domain, which means `SameSite=Lax` MAY still work for normal browser requests while `credentials: 'include'` and explicit CORS origin allowlisting are still required.
- Because the final deployment is not yet proven, cookie policy must be validated in proposal/design rather than assumed. If the real frontend ends up cross-site instead of same-site, `SameSite=None` + `Secure=true` becomes mandatory and CSRF protection becomes NON-NEGOTIABLE.
- Scope the refresh cookie path narrowly (for example `/auth/refresh`) and align cookie `maxAge` to token expiry.
- Hash passwords with **bcrypt**; never store raw passwords; avoid reversible encryption because this is hashing, not encryption.
- Refresh must rotate the stored session token each time. Reuse of an already-rotated refresh token should revoke the affected session family.
- Logout must revoke the current refresh session in the database and clear both auth cookies.
- Because auth uses cookies, enforce **Origin/Referer checks** for unsafe methods and plan **double-submit CSRF tokens** if any cross-site credentialed frontend is expected.

Strict-TDD test strategy and prerequisites:
- Unit tests: credential validation service, password hasher abstraction, token issuer, refresh-rotation service, cookie option factory, role guard, and config validation.
- Integration/E2E tests: login success/failure, cookie issuance, refresh rotation, refresh-token reuse rejection, logout revocation, protected `me` endpoint, and admin-role authorization.
- Prerequisites: dedicated test DB (`mecanismos-dashboard-test`), deterministic test secrets, seed helper for an admin user, and a test helper that can inspect `Set-Cookie` headers with Supertest.
- Prisma/Nest env gotcha: `.env.development` is NOT loaded automatically by either `prisma.config.ts` or Nest's current `ConfigModule.forRoot({ isGlobal: true })` setup. Test commands and helpers must explicitly load the development env file when targeting the test DB, otherwise they can silently hit the default `.env` database.
- DB readiness note: the test database is already migrated and the Prisma client was already regenerated successfully, so the remaining work is test harness wiring, not database bootstrap from scratch.

Docs expected under `/docs` for this feature package:
- `docs/auth/overview.md` — what was built and why.
- `docs/auth/schema.md` — Prisma auth model simplification and migration intent.
- `docs/auth/security.md` — cookie rules, bcrypt choice, rotation, CSRF posture, logout/revocation.
- `docs/auth/testing.md` — TDD layers, required env loading, seed strategy, and E2E flow map.

### Risks
- Deployment topology is still the biggest policy risk: same-site subdomains are likely, but the final cookie and CSRF posture must be validated against the real frontend hosting model.
- Simplifying the boilerplate auth schema in place is the fastest path, but it can fail if the team preserves generic fields out of inertia instead of designing the minimum first-party model intentionally.
- The dedicated test DB exists, but tests can still target the wrong database if `.env.development` loading is not made explicit in the eventual test harness.

### Ready for Proposal
Yes — the exploration is ready to move forward with bcrypt, admin-first role scaffolding, same-site-subdomain-aware cookie planning, and an already-prepared test database. The next phase should lock the minimal auth schema and explicit env-loading strategy into proposal/spec/design.
