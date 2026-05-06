## Exploration: supplier-management

### Current State
- Prisma already has a **flat** `Supplier` model with `name @unique`, optional `phone`, optional `email`, `isActive`, and no runtime Nest module yet. The same schema already links suppliers to future history-bearing tables: `InventoryMovement`, `SupplierQuoteHistory`, `WorkOrderActualCost`, and `WorkOrderEstimateLine`.
- The implemented backend pattern for business CRUD is now clear: **one Nest module per resource** (`customers`, `vehicles`, `components`, `component-types`), controller protected with `JwtAuthGuard + RolesGuard`, DTO validation via global `ValidationPipe`, service-level business checks, and repository-level Prisma access with explicit error mapping.
- Existing protected business routes consistently allow `ADMIN | SALES` and reject `MECHANIC`, which already matches the confirmed supplier access policy.
- Reviewer artifacts are part of the established delivery pattern: feature docs under `docs/<feature>/`, artifact specs under `src/<feature>/*.artifacts.spec.ts`, importable Postman collections under `test/postman/`, unit tests for services/repositories, and e2e tests that override services instead of hitting Prisma directly.
- `openspec/config.yaml` is still missing, so there are no project-level OpenSpec phase rules on disk beyond the prompt-injected standards.

### Affected Areas
- `prisma/schema.prisma` — current `Supplier` shape is too simple for multi-phone behavior and future supplier history relations.
- `prisma/seed.ts` — supplier sample data must be added idempotently so reviewers can exercise routes immediately after seeding.
- `src/app.module.ts` — import point for a future `SuppliersModule`.
- `src/auth/roles.decorator.ts`, `src/auth/roles.guard.ts`, `src/auth/auth.jwt.ts` — existing auth/role primitives that supplier routes should reuse without inventing new policy plumbing.
- `src/customers/*`, `src/vehicles/*`, `src/components/*`, `src/component-types/*` — reference implementation for module/controller/service/repository/DTO/test structure.
- `src/customers/dto/customer-string.transforms.ts` — reusable trim/normalization helpers that supplier DTOs can follow.
- `docs/customer-assets/*`, `docs/auth/*` — reviewer-friendly documentation pattern to mirror for suppliers.
- `test/postman/*.postman_collection.json` — runner-ready manual verification pattern to mirror for supplier flows.
- `test/customer-assets/*.e2e-spec.ts` and `src/customer-assets/customer-assets.artifacts.spec.ts` — testing and artifact conventions to replicate for supplier endpoints.

### Approaches
1. **Minimal flat supplier CRUD** — keep `Supplier.phone` on the parent row and add only a Nest CRUD module around the existing schema.
   - Pros: Smallest migration, fastest initial scaffold, least code touched.
   - Cons: Conflicts with the confirmed requirement for multiple phones, blocks `principal`/`WhatsApp`/`tag` semantics, and becomes a dead-end once search/filtering over phones is needed.
   - Effort: Low

2. **Supplier aggregate with normalized `SupplierPhone` child table** — evolve `Supplier` into a parent entity plus child phones while keeping the Nest resource split and current auth/test/doc patterns.
   - Pros: Matches confirmed product needs, fits Prisma relation-first patterns already used in the project, keeps room for future quote/purchase/cost/inventory history, and supports pragmatic validation with richer search later.
   - Cons: Requires schema migration, nested write design, and explicit decisions about supplier identity fields and uniqueness.
   - Effort: Medium

### Recommendation
Use **Approach 2**.

Preliminary decisions ready to carry into proposal/spec/design:
- Model suppliers as a dedicated `suppliers` resource with its own Nest module, not folded into customer-assets.
- Replace the single flat phone field with a child relation such as `SupplierPhone` so v1 can support **multiple numbers**, one **primary** number, optional **WhatsApp** marker, and future labels/tags.
- Keep route protection aligned with the existing business CRUD pattern: `JwtAuthGuard + RolesGuard` and `@Roles('ADMIN', 'SALES')`; `MECHANIC` stays forbidden.
- Keep validation PRACTICAL: require `name` plus at least one phone entry, trim strings, reject blanks, avoid over-engineered phone regex rules.
- Plan supplier list/search around low-friction operations first: supplier `name`, optional `email`, and phone values via the child table.
- Preserve supplier ID stability because the current schema already references suppliers from quote, inventory-movement, estimate-line, and actual-cost histories.

Preliminary design questions that are NOT fully settled yet:
- `name @unique` looks risky once suppliers can be either person or company and the product wants low-friction capture. Proposal/design should explicitly decide whether to keep, replace, or relax that uniqueness rule.
- Persona natural vs empresa likely needs an explicit discriminator (`PERSON`/`COMPANY` or similar). What is still unclear is whether v1 also needs legal/tax identifiers now, or only the type plus name/phones.

### Risks
- Changing `Supplier` from flat `phone` to normalized phones will require careful migration planning so existing nullable `phone` data is preserved.
- If `name` remains globally unique, the API may become artificially restrictive for natural-person suppliers or duplicate trade names.
- Nested phone writes can create hidden complexity around “exactly one primary phone” unless the contract is defined sharply in spec/design.
- Supplier search across child phones may need query-shape decisions and possibly extra indexes once data volume grows.
- `openspec/config.yaml` is absent, so downstream phases must keep relying on injected standards instead of repo-local phase rules.

### Ready for Proposal
Yes — enough is known to move into proposal/spec/design for a dedicated supplier slice built as a new Nest resource with normalized phone children, existing `ADMIN | SALES` protection, docs/Postman/test artifacts, and explicit decisions still to be locked on supplier identity fields plus uniqueness.
