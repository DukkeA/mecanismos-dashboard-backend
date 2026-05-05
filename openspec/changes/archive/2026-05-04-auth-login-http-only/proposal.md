# Proposal: Auth Login HTTP Only

## Intent

Replace the boilerplate auth shape with a simple first-party auth flow for backend admins: email/password login, HttpOnly cookies, JWT access, and refresh rotation/revocation.

## Scope

### In Scope
- Admin-first auth with roles scaffolded as `ADMIN | SALES | MECHANIC`
- Minimal auth schema for user, password hash, and refresh-session storage
- HTTP API for `login`, `refresh`, `logout`, and protected `me`/admin smoke access
- Cookie, CORS, CSRF, test-DB, and docs direction for local/dev + likely subdomain production

### Out of Scope
- OAuth/social login, email verification, password reset, MFA
- Full employee-to-user coupling, advanced RBAC, multi-device admin UI

## Capabilities

### New Capabilities
- `auth-session`: Email/password authentication with cookie-based session continuity, rotation, revocation, and role-aware protected access

### Modified Capabilities
- None

## Approach

- Keep **bcrypt** for password hashing: explicit team preference, mature ecosystem, sufficient for v1
- Add **`@nestjs/jwt`** for short-lived access tokens and **`cookie-parser`** for HttpOnly cookie parsing
- Keep **`class-validator`/`class-transformer`** for DTO validation/normalization
- **Passport: required for JWT guard/strategy, not required for local login**; use service-level email/password validation to avoid unnecessary `passport-local` ceremony
- Simplify Prisma auth tables in place: keep `user`, reshape credentials to explicit `passwordHash`, convert `session` into refresh-session storage with `tokenDigest`, `expiresAt`, `revokedAt`, `replacedBySessionId`, and lineage/family tracking; remove unused OAuth/verification baggage unless design proves otherwise

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Minimal user/credential/session auth model |
| `src/main.ts` | Modified | Cookies, CORS credentials, security middleware hooks |
| `src/app.module.ts` | Modified | Auth/config module wiring |
| `src/auth/**` | New | Auth controllers, services, guards, DTOs |
| `test/**` | Modified | Cookie auth unit/e2e coverage using test DB |
| `docs/auth/**` | New | Overview, schema, security, testing notes |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Wrong cookie policy for final hosting | Med | Lock assumptions in spec/design; validate same-site vs cross-site |
| Boilerplate schema leftovers leak into v1 | Med | Spec explicit field removals and naming rules |
| Tests hit wrong DB | Med | Design explicit `.env.development` loading path |

## Rollback Plan

Revert auth module and docs, roll back the auth migration, regenerate Prisma client, and return to the current scaffold-only runtime.

## Dependencies

- Exploration artifact `sdd/auth-login-http-only/explore`
- Libraries: `bcrypt`, `@nestjs/jwt`, `cookie-parser`, `class-validator`, `class-transformer`; JWT Passport packages required only for protected-route strategy layer

## Success Criteria

- [ ] Proposal fixes the v1 auth contract around email/password, HttpOnly cookies, and refresh rotation
- [ ] Spec phase can derive one new capability: `auth-session`
- [ ] Design phase has clear decisions to finalize for schema, cookie topology, CSRF posture, and test-env loading
