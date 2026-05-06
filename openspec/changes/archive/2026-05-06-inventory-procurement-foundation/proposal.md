# Proposal: Inventory Procurement Foundation

## Intent

Enable owned-stock control and supplier quote recall around a stable `InventoryItem` catalog, so sales can search an item, see prior supplier quotes, and avoid losing price history before work-order costing is introduced.

## Scope

### In Scope
- Refine `prisma/schema.prisma` as needed for solid item, ledger, quote-history, status/correction/voiding, and index semantics.
- Protected `ADMIN | SALES` APIs for inventory items, stock movements, and supplier quote events.
- Quote history as append-only market events: new prices create new quote rows; corrections/voids are controlled audit actions, not destructive price overwrites.
- Seeds, Swagger, docs, Postman, unit/e2e/artifact tests.

### Out of Scope
- Work-order CRUD, estimates, actual-cost posting, purchase orders, reservations/backorders, automatic stock consumption, profitability reports.
- Negative stock by default.

## Capabilities

### New Capabilities
- `inventory-procurement-foundation`: Item catalog, non-negative stock ledger, supplier quote event history, lookup/search, reviewer artifacts.

### Modified Capabilities
- `supplier-management`: Suppliers become lookup parents for quote history only; supplier lifecycle requirements do not change.

## Approach

- Treat `InventoryItem` as aggregate root. Current stock is derived from `InventoryMovement`; outbound/adjustment writes MUST reject negative resulting stock unless a future backorder/reservation feature changes the rule.
- API candidates: `/inventory-items`, `/inventory-items/:id/movements`, `/inventory-movements`, `/supplier-quotes`, `/inventory-items/:id/supplier-quotes`, `/suppliers/:id/quotes`.
- Quote events capture supplier, item, quoted cost, quote date, notes, optional status/correction metadata. Updating a quote is for typo correction only; new market price is a new event; voiding preserves the row.
- Keep work-order fields internal extension points. Future work orders may reference quote events for estimates and actual costs may link back to inventory item/supplier/selected quote without rewriting quote history.
- Implement by slices: catalog/schema+indexes → movement ledger/non-negative rules → quote history lookup → docs/Postman/e2e polish.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Refine models/enums/indexes for catalog, ledger, quote audit semantics. |
| `prisma/seed.ts` | Modified | Idempotent inventory, movement, quote samples. |
| `src/app.module.ts`, `src/inventory/**`, `src/procurement/**` | New/Modified | Guarded Nest modules/controllers/services/repositories/DTOs. |
| `docs/inventory-procurement/**`, `test/postman/**`, `test/**/*.e2e-spec.ts` | New | Reviewer guidance and executable coverage. |

## Index/Search Strategy

- Add/support indexes for item list/search: `isActive`, `itemType`, `condition`, `name`, `brand`, `reference`, `identifier`, plus practical composites for active reference/identifier lookups.
- Preserve quote indexes by `(inventoryItemId, quotedAt)` and `(supplierId, quotedAt)`; add status/date indexes if correction/void status is persisted.
- Preserve movement indexes by `(inventoryItemId, occurredAt)`, supplier, and future work-order lookup.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Schema underfits audit semantics | Med | Adjust schema before endpoints; test migration/schema expectations. |
| Scope exceeds review budget | High | Deliver in work-unit slices. |
| Stock ledger inconsistencies | Med | Transactional writes and non-negative invariant tests. |

## Rollback Plan

Revert new modules, docs, seeds, Postman artifacts, and Prisma migration/schema deltas for this change. Existing supplier/customer/service behavior remains isolated.

## Dependencies

- Existing auth/roles, suppliers, Prisma generated client, and dev migration workflow.

## Success Criteria

- [ ] Users can search active items and inspect item/supplier quote history.
- [ ] New supplier prices append quote events; corrections/voids preserve audit trail.
- [ ] Stock movements cannot drive stock negative by default.
- [ ] Tests/docs/Postman cover reviewer flows.

## Why Next

This is the next feature because it connects the company’s immediate stock reality with the highest-value supplier-calling workflow, while preparing clean future work-order cost tracking.
