# Tasks: Inventory Procurement Foundation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1100-1500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 schema+catalog -> PR2 ledger -> PR3 quotes -> PR4 reviewer artifacts |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema, migration, seed, catalog baseline | PR 1 | Base slice; includes Prisma generate + catalog tests |
| 2 | Non-negative stock ledger | PR 2 | Depends on Unit 1; transaction and invariant focus |
| 3 | Quote history and supplier lookup | PR 3 | Depends on Unit 2; append-only audit rules |
| 4 | Reviewer docs, Postman, final e2e/artifact sweep | PR 4 | Depends on prior slices; docs/tests only |

## Phase 1: Schema + Seed Foundation

- [x] 1.1 RED: add `src/inventory/inventory-procurement.schema.spec.ts` for Prisma fields, indexes, future-link columns, and migration safety.
- [x] 1.2 GREEN: update `prisma/schema.prisma`, create `prisma/migrations/*inventory_procurement_foundation*/migration.sql`, extend `prisma/seed.ts`, then run `npx prisma generate`.
- [x] 1.3 REFACTOR: stabilize seed ids/upsert keys and share schema-assert helpers if duplication appears.

## Phase 2: Inventory Catalog

- [x] 2.1 RED: add `src/inventory/**/*.spec.ts` plus `test/inventory/inventory-items.e2e-spec.ts` for auth/roles, search filters, derived `currentStock`, and zero-stock items.
- [x] 2.2 GREEN: create `src/inventory/inventory.module.ts`, `inventory-items.controller.ts`, `inventory.service.ts`, `persistence/inventory.repository.ts`, and DTOs; wire `src/app.module.ts`.
- [x] 2.3 REFACTOR: extract stock-summary/query helpers and align Swagger decorators with typed exceptions.

## Phase 3: Movement Ledger

- [x] 3.1 RED: add specs for serializable transaction flow, negative-stock rejection, chronological reads, and absence of edit/delete routes.
- [x] 3.2 GREEN: add `src/inventory/inventory-movements.controller.ts` and movement service/repository methods for create/get/list plus `currentStockAfter`.
- [x] 3.3 REFACTOR: centralize movement-to-stock math and serialization-conflict mapping.

## Phase 4: Procurement Quotes + Supplier Lookup

- [x] 4.1 RED: add `src/procurement/**/*.spec.ts` and `test/procurement/supplier-quotes.e2e-spec.ts` for append-only create, correction-only patch, voided-history visibility, item summaries, and supplier `404`.
- [x] 4.2 GREEN: create `src/procurement/procurement.module.ts`, `supplier-quotes.controller.ts`, `procurement.service.ts`, `persistence/procurement.repository.ts`, DTOs; extend `src/suppliers/suppliers.controller.ts` with `GET /suppliers/:id/quotes`.
- [x] 4.3 REFACTOR: isolate latest-valid quote summary and timeline filter helpers.

## Phase 5: Reviewer Artifacts + Verification

- [x] 5.1 RED/GREEN: add `src/inventory/inventory.artifacts.spec.ts` and `src/procurement/procurement.artifacts.spec.ts`; create `docs/inventory-procurement/{overview,api-map,validation-rules,testing}.md` and `test/postman/mecanismos-dashboard-inventory-procurement.postman_collection.json`.
- [x] 5.2 Verify without build: run `npm run test`, `npm run test:e2e`, and `npm run lint`; document targeted reviewer flows inside the new testing guide.

## Rollback Boundaries

- Unit 1: revert schema, migration, seed, and generated-client expectations only.
- Unit 2: revert catalog and `src/app.module.ts` wiring without touching quotes/docs.
- Unit 3: revert movement endpoints/services/repository methods only.
- Unit 4: revert `src/procurement/**`, supplier quote route, docs, Postman, and related e2e/artifact specs.
