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

### Collection Runner order

1. Import the collection.
2. Confirm `baseUrl` matches the local Nest app.
3. Run the **Admin Runner Happy Path** folder from Collection Runner.
4. Run the **Role & Error Coverage** folder to verify `SALES`/`MECHANIC` restrictions plus invalid login.

### What is automated inside the collection

- `Login as Admin` → `Me as Admin` → `Admin Smoke as Admin` → `Refresh Admin Session` → `Logout Admin Session`
- `Me after Logout returns 401`
- `Login as Sales` + `Admin Smoke forbidden for Sales`
- `Login as Mechanic` + `Admin Smoke forbidden for Mechanic`
- `Invalid Login rejects bad password`

You DO NOT need to swap credentials by hand for the standard seeded flows; the collection already references the seeded admin, sales, and mechanic accounts.

## Review checklist

- [ ] Focused auth tests pass before the full suite.
- [ ] `/auth/me` is verified through automated e2e coverage.
- [ ] Admin rejection is covered for `SALES` and `MECHANIC`.
- [ ] Postman remains supplemental and versioned.
