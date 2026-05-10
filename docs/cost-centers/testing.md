# Cost centers testing guide

## Commands

- Unit/spec focus: `npm run test -- src/cost-centers/cost-centers.artifacts.spec.ts src/cost-centers/cost-centers.service.spec.ts src/cost-centers/cost-centers.controller.spec.ts src/cost-centers/persistence/cost-centers.repository.spec.ts`
- E2E focus: `npm run test:e2e -- test/cost-centers/cost-centers.e2e-spec.ts`
- Full verification for this slice: `npm run lint`, `npm run test`, `npm run test:e2e`

## Reviewer flow

1. Ensure the test database is configured through `DATABASE_URL_TEST` before running `npm run test:e2e`.
2. Run the Postman collection in `test/postman/mecanismos-dashboard-cost-centers.postman_collection.json`.
3. Confirm create/list/get/update, duplicate canonical conflict, `401`, `403`, and missing-id `404`.
4. Re-run `npx prisma db seed` when you want to verify the default `GENERAL`, `BODEGA`, and `OFICINA` rows are still idempotent.

## Seed expectation

`GENERAL`, `BODEGA`, and `OFICINA` are seeded by canonical `code`. Re-running the seed must update or preserve those rows instead of inserting duplicates.

## Rollback order

1. Remove runtime/docs/Postman artifacts that depend on `/cost-centers`.
2. Revert the cost-centers module wiring and seed helper.
3. Revert any downstream references only after the catalog routes are gone.

## Why rollback order matters

The docs and Postman collection describe a protected catalog that depends on the runtime module and seed defaults. Rolling back reviewer artifacts last prevents stale verification instructions from pointing to removed routes.
