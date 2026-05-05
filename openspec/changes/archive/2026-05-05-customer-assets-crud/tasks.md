# Tasks: Customer Assets CRUD

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 900-1300 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 schema+auth -> PR2 customers+vehicles -> PR3 components+artifacts |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Schema + auth guard baseline | PR 1 | migration, generate, shared access tests |
| 2 | Customers + vehicles slice | PR 2 | TDD, docs updated with live routes |
| 3 | Components + reviewer artifacts | PR 3 | includes Postman, artifact tests, verification |

### Acceptance Mapping

`C1-3` customer scenarios; `V1-3` vehicle; `P1-3` component; `A1-3` auth/artifacts.

## Phase 1: Foundation

- [x] 1.1 RED: add `src/auth/roles.guard.spec.ts` for generic allowed-roles `403` messaging and customer-assets role matrix (`A2`, auth-session delta).
- [x] 1.2 GREEN/REFACTOR: update `src/auth/roles.guard.ts`; keep admin-only routes restricted while enabling reusable `ADMIN|SALES` messages.
- [x] 1.3 RED: add schema/artifact expectation test for `Customer.notes` and plan migration touchpoints in `prisma/schema.prisma`, `prisma/migrations/*_customer_notes/migration.sql` (`C1`).
- [x] 1.4 GREEN: add `Customer.notes String?`, create migration SQL, run `npx prisma generate`, and record generated-client dependency without editing `generated/prisma/**`.

## Phase 2: Customers + Vehicles

- [x] 2.1 RED: create failing unit/e2e specs for customer create/list/get/update in `src/customers/**/*.spec.ts` and `test/customer-assets/customers.e2e-spec.ts` (`C1`,`C2`,`C3`,`A1`,`A2`).
- [x] 2.2 GREEN: scaffold `src/customers` via Nest CLI; implement module/controller/service/repository/DTOs with trim/lowercase/query pagination and `409` duplicate mapping.
- [x] 2.3 RED: create failing vehicle specs in `src/vehicles/**/*.spec.ts` and `test/customer-assets/vehicles.e2e-spec.ts` for create, missing parent, immutable `customerId`, and auth (`V1`,`V2`,`V3`,`A1`,`A2`).
- [x] 2.4 GREEN: scaffold `src/vehicles`; implement repository/service/controller/DTOs with uppercase plate, parent existence checks, list filters, and no reassignment.

## Phase 3: Components + Wiring

- [x] 3.1 RED: create failing component specs in `src/components/**/*.spec.ts` and `test/customer-assets/components.e2e-spec.ts` for same-customer vehicle linking, mismatch `400`, immutable ownership, and auth (`P1`,`P2`,`P3`,`A1`,`A2`).
- [x] 3.2 GREEN: scaffold `src/components`; implement DTOs/service/repository/controller with vehicle/customer relation guards, optional vehicle reassignment within same customer, and list filters.
- [x] 3.3 REFACTOR/WIRE: register new modules in `src/app.module.ts`, expand Swagger text in `src/main.ts`, and align shared test fixtures/mocks for Prisma-free e2e coverage.

## Phase 4: Reviewer Artifacts + Verification

- [x] 4.1 RED/GREEN: add `src/customer-assets/customer-assets.artifacts.spec.ts`, then create `docs/customer-assets/overview.md`, `api-map.md`, `validation-rules.md`, `testing.md`, plus `test/postman/mecanismos-dashboard-customer-assets.postman_collection.json` (`A3`).
- [x] 4.2 VERIFY: run targeted `npm run test -- --runInBand` coverage for new unit/e2e/artifact specs, confirm scenarios `C1-3`,`V1-3`,`P1-3`,`A1-3`, and update this file with execution notes during `sdd-apply`.

### Slice 3 execution notes

- RED confirmed first:
  - `npm run test -- src/components/components.service.spec.ts src/components/persistence/components.repository.spec.ts src/customer-assets/customer-assets.artifacts.spec.ts` failed before implementation because component production files and reviewer artifacts did not exist.
  - `npm run test:e2e -- test/customer-assets/components.e2e-spec.ts` failed before implementation because `ComponentsService` did not exist.
- GREEN verification:
  - `npm run format` ✅
  - `npm run test -- src/components/components.service.spec.ts src/components/persistence/components.repository.spec.ts src/customer-assets/customer-assets.artifacts.spec.ts` ✅
  - `npm run test:e2e -- test/customer-assets/customers.e2e-spec.ts test/customer-assets/vehicles.e2e-spec.ts test/customer-assets/components.e2e-spec.ts` ✅
  - `npm run test` ✅
  - `npx tsc --noEmit` ✅
  - `npx eslint src/app.module.ts src/main.ts src/components/**/*.ts src/customer-assets/customer-assets.artifacts.spec.ts test/customer-assets/components.e2e-spec.ts` ✅ after replacing two `toHaveBeenCalled` expectations with mock call-count assertions.
  - `node -e "JSON.parse(require('node:fs').readFileSync('test/postman/mecanismos-dashboard-customer-assets.postman_collection.json','utf8')); console.log('Postman JSON OK')"` ✅
