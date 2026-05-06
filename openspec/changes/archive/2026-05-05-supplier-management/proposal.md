# Proposal: Supplier Management

## Intent

Enable a first protected suppliers slice so `ADMIN | SALES` can create, list, get, and update suppliers with practical capture rules, normalized multi-phone support, and room for future inventory/quote/cost history.

## Scope

### In Scope
- Add a dedicated `suppliers` Nest resource with create/list/get/update endpoints.
- Evolve Prisma from flat `Supplier.phone` to a `Supplier` aggregate plus `SupplierPhone` child rows.
- Support supplier type (`PERSON | COMPANY`), optional legal document fields, optional email/notes, `isActive`, and at least one phone.
- Deliver Swagger, docs under `docs/suppliers/`, Postman collection, and automated tests.

### Out of Scope
- Work-order, purchasing, quote-entry, or inventory-movement workflows.
- Delete/archive flows, duplicate-consolidation UX, and advanced search/index tuning.
- Making legal/tax identification mandatory in v1.

## Capabilities

### New Capabilities
- `supplier-management`: Protected supplier CRUD-lite with normalized phones, pragmatic validation, reviewer docs, Postman, and tests.

### Modified Capabilities
- None.

## Approach

Use a dedicated `src/suppliers/` module that follows the existing resource pattern: guarded controller, validated DTOs, service business rules, and Prisma-backed repository access. Keep supplier IDs stable, relax global `Supplier.name` uniqueness in v1, store phones in `SupplierPhone`, require exactly one primary phone at write time, and keep list/search pragmatic over `name`, `email`, and phone values.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add supplier type/document fields, `SupplierPhone`, and remove flat-phone/global-name assumptions |
| `prisma/migrations/*` | New | Safe schema/data migration for supplier reshape |
| `prisma/seed.ts` | Modified | Idempotent supplier sample data with multiple phones |
| `src/app.module.ts` | Modified | Register `SuppliersModule` |
| `src/suppliers/**` | New | Controller, service, repository, DTOs, tests |
| `docs/suppliers/**` | New | Reviewer-facing feature docs |
| `test/postman/mecanismos-dashboard-suppliers.postman_collection.json` | New | Manual verification artifact |
| `test/suppliers/*.e2e-spec.ts` | New | Protected-route e2e coverage |

## Migration Strategy

Create additive columns/tables first, backfill `SupplierPhone` from legacy `Supplier.phone`, preserve existing supplier IDs and foreign keys, then remove obsolete flat-phone/name-unique constraints only after data copy succeeds.

## Verification Strategy

Unit tests for service/repository rules, controller/auth coverage for `ADMIN | SALES` allowed and `MECHANIC` forbidden, artifact tests for docs/Postman, e2e with service overrides, and migration checks proving old phone data survives the reshape.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Phone normalization breaks old supplier data | Med | Backfill in migration and verify seeded/legacy rows |
| Primary-phone rule drifts between DTO and persistence | Med | Define one-write contract in spec/design and enforce in service |
| Duplicate supplier names create review questions | High | Explicitly allow duplicates in v1 and defer consolidation workflow |

## Rollback Plan

Revert supplier modules/docs/tests/Postman artifacts and roll back the supplier migration before dependent history features start writing through the new shape.

## Dependencies

- Existing auth-session guards/roles
- Prisma client regeneration after schema change
- Root `.env` local runtime/seed strategy

## Success Criteria

- [ ] Specs/design clearly define supplier create/list/get/update with multi-phone support and `ADMIN | SALES` access only.
- [ ] Migration direction preserves existing supplier relations while replacing flat phone storage.
- [ ] Reviewers receive docs, Postman, and automated verification requirements for the supplier slice.
