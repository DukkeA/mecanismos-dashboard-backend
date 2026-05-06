# Tasks: Supplier Management

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 900-1300 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 data reshape → PR2 supplier API → PR3 verification artifacts |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Prisma reshape + seed base | PR 1 | Migration, generate, seed; rollback stays below API layer |
| 2 | Supplier module + repository/service rules | PR 2 | Depends on PR 1; includes unit tests |
| 3 | E2E, docs, Postman, artifact checks | PR 3 | Depends on PR 2; reviewer-facing closeout |

## Batches and Dependencies

- Batch 1 → Batch 2 → Batch 3.
- Do not expose `src/suppliers/**` before the Prisma migration, generated client, and seed shape exist.

## Phase 1: Data Foundation

- [x] 1.1 Update `prisma/schema.prisma` and add `prisma/migrations/*/migration.sql` for `SupplierType`, `SupplierDocumentType`, `SupplierPhone`, legacy phone backfill, dropping `Supplier.name` uniqueness, and removing flat `Supplier.phone` last. Verify: migration SQL shows ID preservation/backfill path. Rollback boundary: migration only.
- [x] 1.2 Run Prisma generate and extend `prisma/seed.ts` with idempotent supplier fixtures covering duplicate names and multiple phones. Verify: generated types support the new relation and seed data mirrors spec cases. Rollback boundary: schema, generated client, seed.

## Phase 2: Supplier API Slice

- [x] 2.1 Create `src/suppliers/suppliers.module.ts`, `suppliers.controller.ts`, `suppliers.service.ts`, `persistence/suppliers.repository.ts`, DTOs, and register the module in `src/app.module.ts`. Verify: routes and guards match `POST/GET/GET:id/PATCH` for `ADMIN | SALES`. Rollback boundary: module isolated from other features.
- [x] 2.2 Implement DTO normalization plus service rules for required phones, default first primary, single-primary enforcement, omitted-phones-on-patch semantics, and `404` mapping. Verify: create/update/not-found scenarios from spec are asserted in unit tests. Rollback boundary: DTO + service.
- [x] 2.3 Implement repository transactions, ordered phone reads, and list search over `name`, `email`, `contactName`, `documentNumber`, and `phones.some.phone`. Verify: repository tests assert query shape, normalization, and write payloads. Rollback boundary: repository only.

## Phase 3: Verification and Reviewer Artifacts

- [x] 3.1 Add `src/suppliers/suppliers.service.spec.ts` and `src/suppliers/persistence/suppliers.repository.spec.ts` for primary-phone rules, duplicate-name acceptance, and replacement semantics. Verify: targeted unit suites cover spec/design contracts. Rollback boundary: tests only.
- [x] 3.2 Add `test/suppliers/suppliers.e2e-spec.ts` using the customers-style service override for `401`, `403`, `400`, `404`, and success responses. Verify: protected-route scenarios pass for `ADMIN`, `SALES`, and `MECHANIC`. Rollback boundary: e2e only.
- [x] 3.3 Add `docs/suppliers/{overview,api-map,validation-rules,testing}.md`, `test/postman/mecanismos-dashboard-suppliers.postman_collection.json`, and `src/suppliers/suppliers.artifacts.spec.ts`. Verify: artifact spec checks docs/Postman presence and implemented routes. Rollback boundary: docs/Postman/artifact tests.

## Phase 4: Finalization

- [x] 4.1 Run `npm run lint` and `npm run format`, then update this file during apply. Verify: final diff only contains intended supplier changes. Rollback boundary: formatting-only edits can be reverted separately.
