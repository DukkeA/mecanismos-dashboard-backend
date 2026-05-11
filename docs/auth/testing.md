# Auth testing guide

The PRIMARY verification gate is AUTOMATED TESTS. The Postman collection is only a supplemental manual artifact for reviewers and operators.

## Quick path

1. Run focused auth tests during development.
2. Run focused admin user management tests before the broad suite.
3. Run `npm run test` before closing the slice.
4. Run auth/admin-user e2e coverage for forced password change and session revocation.
5. Validate the Postman collection still parses as JSON.

## Verification commands

| Goal | Command | Why it matters |
|---|---|---|
| Admin user unit tests | `npm run test -- src/admin-users/admin-users.service.spec.ts src/admin-users/admin-users.controller.spec.ts src/admin-users/persistence/admin-users.repository.spec.ts` | Verifies admin user management rules before broader auth checks |
| Auth unit tests | `npm run test -- src/auth/auth.jwt.spec.ts` | Verifies cookie extraction behavior |
| Auth service tests | `npm run test -- src/auth/auth.service.spec.ts` | Verifies login, refresh, logout, and current-user service behavior |
| Auth/admin e2e | `npm run test:e2e -- test/admin-users/admin-users.e2e-spec.ts test/auth/change-password.e2e-spec.ts` | Verifies admin user management, forced password change, and session revocation |
| Smoke e2e | `npm run test:e2e -- app.e2e-spec.ts` | Protects the Prisma-free app smoke path |
| Full unit suite | `npm run test` | Confirms no local unit regressions |

## TDD expectations

| Step | What to do | Slice 3 example |
|---|---|---|
| RED | Add failing tests first | Missing admin reset, change-password, and revocation contract tests |
| GREEN | Add the minimum code to pass | Admin users module, password-change endpoint, and revocation hooks |
| REFACTOR | Clean structure without changing behavior | Centralize public DTOs and keep secrets out of response shapes |

## Postman usage

Path: `test/postman/mecanismos-dashboard-auth.postman_collection.json`

### Collection Runner order

1. Import the collection.
2. Confirm `baseUrl` matches the local Nest app.
3. Run the **Admin Runner Happy Path** folder from Collection Runner.
4. Run the **Admin User Management** folder to verify setup-captured IDs, create/reset flows, and forced password change.
5. Run the **Role & Error Coverage** folder to verify `SALES`/`MECHANIC` restrictions plus invalid login.

### What is automated inside the collection

- `Login as Admin` → `Me as Admin` → `Admin Smoke as Admin` → `Refresh Admin Session` → `Logout Admin Session`
- `Login as Admin` → `Admin Create User` → `Admin List Users` → `Admin Reset User Password` → `Managed User Login With Reset Password` → `Change Own Password`
- `Me after Logout returns 401`
- `Login as Sales` + `Admin Smoke forbidden for Sales`
- `Login as Mechanic` + `Admin Smoke forbidden for Mechanic`
- `Invalid Login rejects bad password`

You DO NOT need to swap credentials by hand for the standard seeded flows; the collection already references the seeded admin, sales, and mechanic accounts.

## Review checklist

- [ ] Focused auth tests pass before the full suite.
- [ ] `/auth/me` is verified through automated e2e coverage.
- [ ] Admin user management coverage includes create, reset, forced change, and revoked refresh sessions.
- [ ] Admin rejection is covered for `SALES` and `MECHANIC`.
- [ ] Postman remains supplemental and versioned.
