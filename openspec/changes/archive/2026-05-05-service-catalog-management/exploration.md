## Exploration: service-catalog-management

### Current State
- Prisma already has a `ServiceCatalog` table, but it is still a thin placeholder: `id`, `name @unique`, optional `description`, `isActive`, timestamps, and a single downstream relation from `WorkOrderEstimateLine.serviceCatalogId`. There is NO NestJS runtime slice for it yet under `src/`.
- The current business CRUD pattern is stable and worth reusing: one module per resource, controller-level `JwtAuthGuard + RolesGuard`, `@Roles('ADMIN', 'SALES')`, DTO validation via the global `ValidationPipe`, service-level business rules, and thin Prisma repositories behind DI tokens.
- `component-types` is the closest duplicate-prevention precedent: it preserves a human `name`, derives a normalized `slug`, stores `slug @unique`, and maps uniqueness collisions to typed `409 Conflict` responses. That pattern already strips accents, lowercases, compresses separators, and is compatible with combobox-style lookup/create flows.
- `suppliers` shows the current reviewer-delivery convention: resource docs under `docs/<feature>/`, artifact specs, Postman collections, service/repository unit tests, and Prisma-light e2e coverage that overrides the service instead of hitting the database directly.
- `openspec/config.yaml` is absent, so this change should keep relying on the injected standards and the existing repo conventions rather than local OpenSpec phase rules.

### Affected Areas
- `prisma/schema.prisma` — current `ServiceCatalog.name @unique` is too weak for the confirmed duplicate policy because PostgreSQL string uniqueness does not collapse accents, case, or whitespace variants.
- `prisma/migrations/20260504065151_add_business_domain/migration.sql` — baseline shows `ServiceCatalog` exists already, so any future schema adjustment must be a forward migration, not a greenfield create.
- `prisma/seed.ts` — future apply work must add idempotent sample services so reviewers can create/reuse them immediately after seeding.
- `src/component-types/*` — strongest reference for `/services` because it already models reusable combobox-friendly catalog data with normalized slug uniqueness and typed conflict handling.
- `src/suppliers/*` — reference for protected CRUD structure, reviewer artifacts, and current testing/documentation expectations.
- `src/app.module.ts` — future import point for a `ServicesModule` once runtime work starts.
- `docs/business-context.md` — confirms services are reusable business catalog entries and that frontend UX will eventually create them inline from a combobox.
- `test/postman/*`, `docs/<feature>/*`, `src/<feature>/*.artifacts.spec.ts` — expected reviewer-facing artifact pattern to mirror in later phases.

### Approaches
1. **Keep `name` as the only unique key** — normalize the incoming display name and continue relying on `ServiceCatalog.name @unique`.
   - Pros: Smallest schema/API delta, fewer moving parts, fastest path to a basic `/services` CRUD.
   - Cons: Weak duplicate protection unless the stored `name` is aggressively canonicalized; preserving user-friendly accents/casing becomes awkward; future combobox create/reuse can still drift if display formatting changes.
   - Effort: Low

2. **Add canonical uniqueness separate from display name** — keep `name` for display, add a normalized unique field (preferably `slug`, matching `component-types`) derived from the service name, and use that canonical field for duplicate prevention.
   - Pros: Directly satisfies the confirmed requirement that `Diagnóstico`, `diagnostico`, `DIAGNOSTICO`, and whitespace variants collide; preserves human-friendly display text; reuses an EXISTING project pattern; fits future combobox create/reuse semantics.
   - Cons: Requires schema migration work, explicit repository conflict mapping, and a decision on whether the slug is API-visible or persistence-only in v1. For a populated real dataset, a separate production-safe migration path would still need to be designed later.
   - Effort: Medium

### Recommendation
Use **Approach 2**.

Recommended direction for proposal/spec/design:
- Expose the resource as `/services` backed by its own Nest module, following the same controller/service/repository/module split already used by `component-types` and `suppliers`.
- Preserve `ServiceCatalog.name` as the human label, but stop trusting raw `name` uniqueness for duplicate prevention.
- Introduce a canonical normalized unique field — `slug` is the best fit because the codebase ALREADY has a working normalization strategy in `component-types.service.ts`.
- Treat slug generation as mandatory on create and deterministic on rename so all accent/case/whitespace variants converge to the same canonical key.
- Return typed `409 Conflict` for canonical collisions instead of letting raw Prisma uniqueness bubble up.
- Keep initial scope coherent with the future combobox UX: create, list, get, update, and active/inactive filtering are likely enough for v1; work-order usage can stay deferred while the catalog is stabilized first.

### Risks
- If the change keeps only `name @unique`, duplicate prevention will LOOK implemented while still missing the exact collision cases the product cares about.
- If slug uniqueness is introduced without a clear rename policy, updates may accidentally create collisions or confusing display/canonical mismatches.
- If the project later needs to migrate a populated real dataset, that work will require a dedicated production-safe plan beyond this reset/dev baseline.
- Route naming can create ambiguity with broader “services” application concepts, so the proposal/spec should explicitly scope `/services` to the reusable business service catalog.
- `WorkOrderEstimateLine` already references `ServiceCatalog`, so any future non-reset migration must be designed deliberately instead of being inferred from this dev-only archive.

### Ready for Proposal
Yes — enough is known to move into proposal/spec/design for a dedicated `/services` catalog resource that follows current NestJS/Prisma patterns and uses canonical normalized uniqueness (preferably slug-based) to block near-duplicate service names reliably.
