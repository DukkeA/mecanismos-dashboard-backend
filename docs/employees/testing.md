# Employees testing guide

## Commands

- Unit/spec focus: `npm run test -- src/employees/dto/employee-dtos.spec.ts src/employees/employees.service.spec.ts src/employees/persistence/employees.repository.spec.ts src/employees/employees.controller.spec.ts src/employees/employees.module.spec.ts src/employees/employees.artifacts.spec.ts src/employees/employees.seed.spec.ts`
- E2E focus: `npm run test:e2e -- test/employees/employees.e2e-spec.ts`
- Typecheck: `npx tsc --noEmit`

## Reviewer flow

1. Seed the dev database with `npx prisma db seed` if you need the stable employee/cost-center fixtures.
2. Run the Postman collection in `test/postman/mecanismos-dashboard-employees.postman_collection.json`.
3. Confirm create/list/get/update, inactive lifecycle, cost-center options, unknown cost-center `404`, missing employee `404`, bonus ownership, forbidden `MECHANIC`, and invalid payload `400`.

## Seed note

Employee reviewer flows assume the default cost centers plus employee/manual bonus fixtures from `prisma/seed.ts`. The collection itself creates its own runtime employee for isolated verification.

## Rollback order

1. Remove runtime/docs/Postman artifacts that depend on `/employees`.
2. Revert the employee module wiring, tests, and seed helper usage.
3. Revert employee seed additions after downstream slices stop depending on them.

## Why rollback order matters

The reviewer artifacts and seeds assume the employee module is present. If you roll back seed or runtime pieces out of order, reviewer scripts and bonus verification drift out of sync.
