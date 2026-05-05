# Design: Auth Login HTTP Only

## Technical Approach

Build a single `AuthModule` around first-party email/password login for admin users, backed by Prisma, bcrypt, JWT access tokens, and rotated refresh sessions in HttpOnly cookies. This follows the proposal/exploration decision to simplify the existing boilerplate auth schema IN PLACE instead of introducing a second auth model.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Nest structure | Add `src/auth/` with controller, service, JWT strategy, guards, decorators, DTOs, cookie factory, and Prisma-backed persistence helpers; no standalone `UsersModule` yet | Separate `UsersModule` now | Auth is the only current user consumer; avoid premature module sprawl while keeping user/session persistence split inside auth services |
| Libraries | `bcrypt`, `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `cookie-parser`, `class-validator`, `class-transformer` | Argon2id, `passport-local`, custom cookie parsing | Matches user preference, Nest conventions, and minimal ceremony. Passport stays ONLY for JWT guard/strategy, not login validation |
| Prisma auth model | Keep `user`, `account`, `session`; delete `verification` | Full table replacement/renames now | Lowest migration churn while still removing boilerplate baggage decisively |
| Cookie/CSRF posture | Access + refresh tokens both in HttpOnly cookies; `SameSite=Lax` for same-site subdomains, `credentials: true`, origin allowlist, Origin/Referer checks on unsafe methods | Store access token in JSON body; `SameSite=None` immediately | Keeps JS away from tokens and fits likely `mecanismos-tecnicos.com` / `api.mecanismos-tecnicos.com` topology. If deployment is truly cross-site, switch to `SameSite=None` + mandatory double-submit CSRF before release |
| Env loading | Keep the root `.env` as the current single source for local Nest runtime, Prisma CLI, and local tests | Add `.env.development` / `.env.test` with `NODE_ENV` switching now | Matches the user's local-only stage and avoids premature environment-loading complexity; explicit separation is deferred until CI/staging/deploy needs exist |

## Data Flow

`POST /auth/login` → validate DTO → lookup active user by email → compare bcrypt hash → create short access JWT + opaque refresh token → persist refresh session digest/family/expiry → set cookies.

`POST /auth/refresh` → read refresh cookie → digest lookup → reject revoked/reused/expired session → revoke current row, create replacement row, issue new cookies. Reuse detection revokes the whole family.

`POST /auth/logout` → revoke current session row → clear cookies.

`GET /auth/me` / admin routes → JWT cookie → Passport JWT strategy → roles guard.

## File Changes

| File | Action | Description |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `UserRole`; extend `user` with `role`, `isActive`, `lastLoginAt`; reduce `account` to password credentials (`passwordHash`, optional `passwordUpdatedAt`); reshape `session` to refresh-session storage: `tokenDigest`, `expiresAt`, `revokedAt`, `replacedBySessionId`, `familyId`, `lastUsedAt`, `ipAddress`, `userAgent`; remove obsolete OAuth fields and `verification` |
| `prisma/migrations/*auth*` | Create | Schema migration for simplification and session lineage |
| `src/app.module.ts` | Modify | Register validated config and `AuthModule` without adding env-file switching logic |
| `src/main.ts` | Modify | Enable `cookie-parser`, CORS credentials/origin policy, global validation pipe |
| `src/auth/**` | Create | Auth API, services, JWT strategy, guards/decorators, cookie/config helpers, persistence services |
| `src/prisma.service.ts` | Modify | Keep runtime DB resolution compatible with the root `.env`; optional config injection remains allowed if it does not introduce multi-file env complexity |
| `test/auth/**/*.spec.ts` | Create | Strict TDD unit/integration/e2e auth coverage |
| `test/postman/mecanismos-dashboard-auth.postman_collection.json` | Create | Importable supplemental manual verification for implemented auth endpoints; Slice 2 covers login/refresh/logout first |
| `docs/auth/{overview,schema,security,testing}.md` | Create | Feature documentation package |

## Interfaces / Contracts

```ts
type AuthenticatedUser = { sub: string; role: 'ADMIN' | 'SALES' | 'MECHANIC' };
type AuthCookies = { accessToken: string; refreshToken: string };
```

Cookie names: `md_access`, `md_refresh`. Refresh cookie path SHOULD be `/auth/refresh`; access cookie path `/`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Password compare, token issuing, cookie options, role guard, config validation, reuse detection | Jest with mocked Prisma/JWT/clock |
| Integration | Auth service + Prisma session rotation/revocation | Local test DB referenced from root `.env`, with seeded admin user and deterministic secrets |
| E2E | Login, refresh rotation, refresh reuse rejection, logout, `me`, admin guard, cookie headers | Supertest against Nest app using the same root `.env` strategy as local runtime |
| Manual supplemental | Importable Postman requests for implemented auth endpoints | Keep `test/postman/mecanismos-dashboard-auth.postman_collection.json` versioned; Slice 2 includes login/refresh/logout, then append `me` and admin requests in later slices |

Strict TDD: write failing tests first for login, refresh, logout, and guards before runtime code. Automated unit/integration/e2e coverage stays the release gate; the Postman collection is only a reviewer/operator convenience artifact for manual verification and sharing. For the current local-only phase, keep the connection string and auth secrets in the root `.env` for runtime, Prisma, and local tests alike. When CI, staging, or deployment automation is introduced, split environment files or secret sources explicitly before those flows depend on them.

## Migration / Rollout

One Prisma migration updates auth tables and deletes obsolete verification/OAuth fields. After schema change, run `npx prisma generate`. No phased rollout is needed because auth is net-new runtime behavior.

## Open Questions

- [ ] Confirm final frontend hosting is same-site subdomain before freezing `SameSite=Lax`; otherwise upgrade to `SameSite=None` + double-submit CSRF.
- [ ] Before CI/staging/deploy automation is introduced, define explicit environment separation instead of reusing the local root `.env` strategy.
