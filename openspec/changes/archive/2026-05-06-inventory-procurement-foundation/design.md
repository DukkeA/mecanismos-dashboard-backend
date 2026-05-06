# Design: Inventory Procurement Foundation

## Technical Approach

Activate the dormant Prisma inventory/procurement graph with two Nest modules: `InventoryModule` for catalog + physical stock ledger and `ProcurementModule` for supplier quote events. Keep controllers guarded like existing `suppliers`/`services`, keep Prisma access behind injectable repositories, and derive `currentStock` from `InventoryMovement` instead of storing editable stock.

## Architecture Decisions

| Area | Option / tradeoff | Decision |
|------|-------------------|----------|
| Schema | Existing tables are close, but quote audit and future cost links are under-modeled. | Add indexes to `InventoryItem`; add `SupplierQuoteStatus`, `updatedAt`, `status`, `voidedAt`, `voidReason`, `correctionReason`; add optional `supplierQuoteHistoryId` to `WorkOrderEstimateLine` and `WorkOrderActualCost` as internal extension points only. |
| Stock invariant | Application-only checks are easy but race-prone. Raw SQL locks are stronger but unnecessary now. | Use Prisma interactive `$transaction` with PostgreSQL `Serializable` isolation: verify item exists/active, aggregate current stock, reject negative result, create movement. Map serialization conflicts to retry/client-safe error in service tests. |
| Stock derivation | Persisted counter is fast but creates dual truth. Ledger aggregate is slower but auditable. | Page items first, then `groupBy` movements for returned item ids by `inventoryItemId` + `movementType`; compute `IN - OUT` in TS. Treat `MANUAL_ADJUSTMENT` as reason with `IN`/`OUT` in v1. |
| Quote history | Full CRUD destroys price memory. Append-only is auditable but needs correction path. | `POST` always creates market events. `PATCH` is controlled correction with `correctionReason`. `PATCH /supplier-quotes/:id/void` sets status/void fields and excludes row from latest-valid summaries. |

## Data Flow

```text
Controller ──DTO──> Service ──business rules──> Repository ──Prisma──> PostgreSQL
                         │                           │
                         └── maps HTTP exceptions    └── typed generated Prisma models
```

Movement create: validate DTO → transaction reads current derived stock → compute candidate stock → reject `< 0` → insert ledger row → return movement plus `currentStockAfter`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Quote audit fields/status, work-order quote link columns, item/search indexes, movement/quote indexes. |
| `prisma/migrations/*inventory_procurement_foundation*/migration.sql` | Create | Dev migration for schema/index changes; no table drops. |
| `prisma/seed.ts` | Modify | Idempotent inventory items, movements, quote events. |
| `src/app.module.ts` | Modify | Import `InventoryModule`, `ProcurementModule`. |
| `src/inventory/**` | Create | Module, items/movements controllers, services, repositories, DTOs/specs. |
| `src/procurement/**` | Create | Supplier quote controller/service/repository/DTOs/specs. |
| `src/suppliers/suppliers.controller.ts` | Modify | Add `GET /suppliers/:id/quotes` delegating to procurement service. |
| `docs/inventory-procurement/**`, `test/postman/*` | Create | Reviewer docs and executable examples. |

## Interfaces / Contracts

- `GET /inventory-items`: `{ data: InventoryItemSummary[], meta }`, each item includes `currentStock`.
- `POST /inventory-items`: creates catalog row; no stock field.
- `GET /inventory-items/:id`: item detail with `currentStock`.
- `POST /inventory-items/:id/movements` and `POST /inventory-movements`: create physical movement; response includes `currentStockAfter`.
- `GET /inventory-items/:id/movements`, `GET /inventory-movements/:id`: chronological ledger reads.
- `POST /supplier-quotes`: append quote event.
- `GET /inventory-items/:id/supplier-quotes`: `{ latestBySupplier: QuoteSummary[], history: QuoteEvent[] }`.
- `GET /suppliers/:id/quotes`: supplier timeline with item/status/date filters; `404` when supplier is absent.
- `PATCH /supplier-quotes/:id`: correction only; requires `correctionReason`.
- `PATCH /supplier-quotes/:id/void`: voids without deleting.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Schema/artifact | Fields, indexes, migration safety, docs/Postman presence | Jest file-content specs following `services.schema.spec.ts`. |
| Unit | DTO transforms, pagination, guards, stock invariant, quote correction/voiding | Mock repositories/Prisma transaction seams with `Test.createTestingModule`. |
| E2E | Auth/role behavior and route contracts | New Prisma-light specs overriding feature services; keep smoke test mocked. |
| Postman/docs | Reviewer happy path | Collection covers login, item search, movement reject, quote append/void. |

## Migration / Rollout

Run schema migration before runtime slices; then `npx prisma generate` in apply phase. Roll out by reviewable slices: (1) schema+catalog, (2) movement ledger, (3) quote history/supplier lookup, (4) docs/Postman/e2e polish. Rollback each slice by reverting its module/artifact plus matching migration; no existing supplier lifecycle behavior changes.

## Open Questions

None.
