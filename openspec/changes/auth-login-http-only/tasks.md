# Tasks: Auth Login HTTP Only

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 900-1300 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 schema+config+test harness -> PR2 login/refresh/logout -> PR3 guards/docs/verify |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Dependencies, Prisma auth reshape, config/test harness | PR 1 | Includes RED tests for config/cookies/schema-adjacent services |
| 2 | Login, refresh rotation/reuse, logout flows | PR 2 | TDD-first unit + e2e |
| 3 | JWT guard, roles/admin, Swagger, docs, final verify | PR 3 | Reviewer-facing finish slice |

## Phase 1: Foundation

- [x] 1.1 Install runtime/dev packages in `package.json`: `bcrypt`, `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `cookie-parser`, `class-validator`, `class-transformer`, and needed `@types/*`.
- [x] 1.2 RED: add failing config/cookie unit specs under `src/auth/config/**/*.spec.ts` for env validation, cookie names/paths, `Secure`/same-site behavior, and root `.env` assumptions.
- [x] 1.3 GREEN: create `src/auth/` via Nest CLI (`module`, `controller`, `service`) plus config/cookie helpers, then wire `src/app.module.ts` and `src/main.ts` with validation pipe, `cookie-parser`, CORS credentials, and configurable origins.
- [x] 1.4 RED: add failing Prisma-oriented tests for credential lookup, refresh-session rotation, reuse-family revocation, and logout revocation in `test/auth/**/*.spec.ts`.
- [x] 1.5 GREEN: simplify `prisma/schema.prisma`, create auth migration, run `npx prisma generate`, and add test seed/helper files for an active admin user using ONLY root `.env`.

## Phase 2: Session Flows

- [ ] 2.1 RED: add failing e2e + service tests for `POST /auth/login` success and invalid login, including Set-Cookie assertions and no-cookie rejection.
- [ ] 2.2 GREEN: implement DTOs, controller, service, Prisma persistence, bcrypt verification, JWT issuing, refresh digest storage, and Swagger decorators for login responses/errors.
- [ ] 2.3 RED: add failing tests for `POST /auth/refresh` rotation and reuse detection/revocation.
- [ ] 2.4 GREEN: implement refresh token parsing, rotation lineage, family revoke-on-reuse, cookie re-issue, plus `POST /auth/logout` revoke-and-clear behavior.

## Phase 3: Protected Access

- [ ] 3.1 RED: add failing tests for `GET /auth/me`, JWT cookie extraction, and admin-only rejection for `SALES`/`MECHANIC`.
- [ ] 3.2 GREEN: implement JWT strategy, auth guard, roles decorator/guard, `me` endpoint, and one admin smoke endpoint with Swagger auth metadata.
- [ ] 3.3 REFACTOR: remove starter-only auth assumptions, keep module boundaries clean, and update `src/app.controller.spec.ts` / `test/app.e2e-spec.ts` if they conflict with auth wiring.

## Phase 4: Docs and Verification

- [ ] 4.1 Write `/docs/auth/{overview,schema,security,testing}.md` covering schema simplification, cookie/CSRF posture, root `.env` rule, TDD flow, and operational gotchas.
- [ ] 4.2 Verify with `npm run test` and `npm run test:e2e`; if a read-only lint check is needed, use non-mutating ESLint instead of `npm run lint`.

## Acceptance Checks

| Spec scenario | Tasks |
|---|---|
| Successful/invalid login | 2.1-2.2 |
| Successful refresh / reuse revoked | 2.3-2.4 |
| Logout clears session | 2.4 |
| Read current user / admin enforcement | 3.1-3.2 |
| Production cookie attributes | 1.2-1.3, 2.2 |
| Local env shared / auth docs delivered | 1.2, 1.5, 4.1 |
