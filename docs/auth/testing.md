# Auth testing guide

The PRIMARY verification gate is AUTOMATED TESTS. The Postman collection is only a supplemental manual artifact for reviewers and operators.

## Quick path

1. Run focused auth tests during development.
2. Run `npm run test` before closing the slice.
3. Run auth e2e plus the smoke e2e spec.
4. Run `npx tsc --noEmit` and non-mutating ESLint for touched files.
5. Validate the Postman collection still parses as JSON.

## Verification commands

| Goal | Command | Why it matters |
|---|---|---|
| Auth unit tests | `npm run test -- src/auth/auth.jwt.spec.ts` | Verifies cookie extraction behavior |
| Auth service tests | `npm run test -- src/auth/auth.service.spec.ts` | Verifies login, refresh, logout, and current-user service behavior |
| Auth e2e | `npm run test:e2e -- auth/auth.e2e-spec.ts` | Verifies cookies, `/auth/me`, and admin role enforcement |
| Smoke e2e | `npm run test:e2e -- app.e2e-spec.ts` | Protects the Prisma-free app smoke path |
| Full unit suite | `npm run test` | Confirms no local unit regressions |
| TypeScript | `npx tsc --noEmit` | Confirms compile-time correctness |
| ESLint | `npx eslint "src/auth/**/*.ts" "src/main.ts" "test/auth/**/*.ts" "test/app.e2e-spec.ts"` | Read-only lint verification for touched files |

## TDD expectations

| Step | What to do | Slice 3 example |
|---|---|---|
| RED | Add failing tests first | Missing `/auth/me`, JWT extractor, and admin-role rejection tests |
| GREEN | Add the minimum code to pass | JWT strategy, guards, `getCurrentUser()`, protected routes |
| REFACTOR | Clean structure without changing behavior | Separate decorators/guards and clean Swagger naming |

## Postman usage

Path: `test/postman/mecanismos-dashboard-auth.postman_collection.json`

### Happy path

1. Import the collection.
2. Set `baseUrl`, `email`, and `password`.
3. Run `Login` first so Postman stores cookies.
4. Run `Me`.
5. Run `Admin Smoke` with an `ADMIN` account.
6. Run `Refresh` and `Logout` as needed.

## Review checklist

- [ ] Focused auth tests pass before the full suite.
- [ ] `/auth/me` is verified through automated e2e coverage.
- [ ] Admin rejection is covered for `SALES` and `MECHANIC`.
- [ ] Postman remains supplemental and versioned.
