## Exploration: inventory-procurement-foundation

### Current State
- The backend already implements protected runtime slices for `auth`, `customers`, `vehicles`, `components`, `component-types`, `suppliers`, and `services`. `src/app.module.ts` wires `AuthModule`, `CustomersModule`, `VehiclesModule`, `ComponentsModule`, `ComponentTypesModule`, `SuppliersModule`, and `ServicesModule` — but there is NO Nest runtime module yet for inventory, procurement, or work orders.
- Prisma is AHEAD of runtime here. `prisma/schema.prisma` already contains dormant business models for `InventoryItem`, `InventoryMovement`, `SupplierQuoteHistory`, `WorkOrder`, `WorkOrderEstimate`, `WorkOrderEstimateLine`, `WorkOrderActualCost`, `WorkOrderPayment`, and `WorkshopWorkOrderDetails`. So this is NOT greenfield modeling; it is activation and refinement of an existing domain baseline.
- `InventoryItem` already anchors the future graph: movements, supplier quote history, estimate lines, and actual costs all point to it. `SupplierQuoteHistory` already points to both `Supplier` and optional `WorkOrder`. `InventoryMovement` already points to optional `Supplier` and optional `WorkOrder`.
- Seeds currently cover users, customers, vehicles, component types, components, services, and suppliers. There are NO inventory items, inventory movements, supplier quote history rows, or work-order sample records in `prisma/seed.ts` yet.
- Existing delivery conventions are stable and should be reused: guarded controllers with `JwtAuthGuard + RolesGuard`, `ADMIN | SALES` access for business resources, DTO validation via the global `ValidationPipe`, thin Prisma repositories behind DI, reviewer docs under `docs/<feature>/`, Postman collections under `test/postman/`, artifact specs, and Prisma-light e2e tests that override services instead of hitting the DB directly.
- `openspec/config.yaml` is absent, so downstream phases must keep relying on the injected standards and current repo conventions.

### Affected Areas
- `prisma/schema.prisma` — source of truth for the already-existing inventory/procurement/work-order graph; proposal must decide which current fields/enums are exposed now versus deferred.
- `prisma/migrations/20260504065151_add_business_domain/migration.sql` — baseline proving these tables already exist, so future work is refinement/activation rather than initial creation.
- `prisma/seed.ts` — must add representative, idempotent inventory/procurement data so reviewers can test lookup flows immediately.
- `src/app.module.ts` — future import point for inventory/procurement modules.
- `src/suppliers/**` and `src/services/**` — strongest runtime references for guarded resource structure, query DTOs, artifact tests, and e2e override patterns.
- `src/services/services.schema.spec.ts` — reference pattern for schema/migration artifact tests when a feature refines an existing baseline table instead of creating a brand-new one.
- `docs/business-context.md` — confirms the business need for owned stock, supplier quote history, and later work-order/cost integration.
- `test/postman/*.json`, `docs/<feature>/*`, `test/**/*.e2e-spec.ts` — reviewer-facing artifact conventions that inventory/procurement must match.

### Approaches
1. **Inventory-only foundation** — implement only `InventoryItem` catalog plus manual stock movements now, and defer quote history.
   - Pros: Smaller initial scope, easier review, gets owned-stock control started quickly.
   - Cons: Misses the user’s highest-value workflow (search an item and see supplier quote history), leaves procurement disconnected, and risks a second redesign around item lookup/reporting semantics.
   - Effort: Medium

2. **Procurement-only quote history** — implement only supplier quote registration/search around `SupplierQuoteHistory` and defer stock ledger.
   - Pros: Directly addresses the “who should we quote first?” workflow.
   - Cons: Weak foundation because quotes need a stable item catalog to be reusable, and it postpones the company-owned inventory problem the user explicitly cares about.
   - Effort: Medium

3. **Combined inventory-procurement foundation** — treat `InventoryItem` as the aggregate root and deliver item catalog + manual stock ledger + supplier quote history/lookup, while explicitly deferring work-order writes and automatic stock consumption.
   - Pros: Matches the real business boundary, reuses the schema’s existing relation graph, satisfies the immediate stock problem AND the historical quote lookup problem, and leaves clean extension points for future work-order estimates/actual costs.
   - Cons: Bigger change; likely exceeds a single 400-line review slice unless delivered as chained work units.
   - Effort: High

### Recommendation
Use **Approach 3**, and KEEP the umbrella change name **`inventory-procurement-foundation`**.

Do NOT reduce this to plain `inventory-management`. That would ignore procurement history, which is already part of both the business need and the Prisma model. But ALSO do not treat it as one giant CRUD blob. The durable boundary is:

- **Inventory item catalog** (`InventoryItem`) as the stable identity for owned parts/components.
- **Inventory ledger** (`InventoryMovement`) for manual stock in/out/adjustment history and current on-hand calculation.
- **Supplier quote history + lookup** (`SupplierQuoteHistory`) keyed to inventory items and suppliers, so a user can search an item and inspect historical quotes.

Recommended v1 boundaries for proposal/spec/design:

- Expose protected `ADMIN | SALES` APIs for:
  - create/list/get/update inventory items
  - create/list/get inventory movements, with item-scoped movement history
  - create/list/get supplier quote history, with item-scoped and supplier-scoped lookup
- Treat `InventoryItem` as REQUIRED for quote history in this slice, even though the business doc once described it as conceptually optional. The current schema already requires it, and the confirmed lookup workflow starts from an item.
- Keep `workOrderId` and `isReservedForWorkOrder` OUT of the public API for this phase, even when columns already exist. Those fields are extension points for future work-order integration, not part of this foundation’s public contract.
- Do NOT implement work orders, estimate lines, actual costs, winning-quote selection, purchase orders, or automatic stock consumption yet.
- Prefer **append-only historical behavior** for supplier quotes. History is a factual record; proposal should strongly consider create/list/get with no delete, and only allow updates if the user explicitly wants correction workflows.
- Derive current stock from the movement ledger rather than inventing a second persisted stock counter.

Delivery note for later phases: this SHOULD be one product change but likely multiple work-unit implementation slices (for example: catalog first, ledger second, quote history third) to stay inside review budget.

### Risks
- The current `InventoryMovementReason` enum is partially work-order-centric (`WORK_ORDER_PURCHASE`, `WORK_ORDER_CONSUMPTION`) and does NOT clearly cover every generic non-work-order outflow. Proposal must decide whether to narrow exposed reasons now or refine the enum before apply.
- If movement APIs allow negative stock casually, the ledger becomes operational fiction. If they forbid it too aggressively, real-world catch-up adjustments become painful.
- Quote history wants auditability. If the API cargo-cults full CRUD, the team may accidentally let users rewrite historical supplier prices and destroy traceability.
- Search/read requirements may need extra indexes beyond today’s schema, especially for practical inventory lookup by `name`, `brand`, `reference`, `identifier`, and active state.
- This umbrella is probably too large for a single review-sized PR even if it is the correct feature boundary.

### Ready for Proposal
Yes — enough is known to move into proposal/spec/design for a combined `inventory-procurement-foundation` change, provided downstream phases keep the scope anchored on item catalog + stock ledger + supplier quote history, explicitly defer work-order behavior, and plan chained implementation slices if the 400-line review budget is at risk.
