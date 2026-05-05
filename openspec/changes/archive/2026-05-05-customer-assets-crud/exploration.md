## Exploration: customer-assets-crud

### Current State
- Prisma already models `Customer`, `Vehicle`, and `Component` with core relations. Unique constraints exist on `Customer(documentType, documentNumber)` and `Vehicle.plate`; `Component.identifier` is only indexed, not unique. `Customer` also lacks the `notes` field described in the business doc.
- `docs/business-context.md` makes the product direction explicit: v1 must register customers, vehicles, and customer-owned components with PRACTICAL traceability, low-friction optional data, and no destructive deletion where history matters.
- Auth v1 is already in place with cookie-based JWT protection, `JwtAuthGuard`, `@Roles()`, and `RolesGuard`. That means customer-assets endpoints can reuse the existing protection model instead of inventing a new one.
- `src/main.ts` already applies a global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, and `transform`, so DTO validation can follow the current Nest pattern directly.
- There are no customer/vehicle/component runtime modules, tests, docs, or Postman artifacts yet.
- The OpenSpec tree exists, but `openspec/config.yaml` is currently missing.

### Affected Areas
- `prisma/schema.prisma` — source of truth for customer-assets fields, uniqueness, and relation behavior.
- `docs/business-context.md` — defines the operational philosophy, traceability rules, and v1 priority for customers, vehicles, and components.
- `src/auth/jwt-auth.guard.ts` — reusable protected-route guard for access-cookie auth.
- `src/auth/roles.decorator.ts` — route-level role declaration for write/read policy.
- `src/auth/roles.guard.ts` — authorization enforcement; its current forbidden message is too admin-specific for future `ADMIN | SALES` routes.
- `src/main.ts` — confirms global DTO validation behavior already exists.
- `src/app.module.ts` — current module composition point for adding the new domain modules.
- `docs/auth/*` — existing reviewer-doc package pattern that customer-assets should mirror.
- `test/postman/mecanismos-dashboard-auth.postman_collection.json` — existing importable Postman artifact pattern.
- `test/auth/auth.e2e-spec.ts` and `src/auth/auth.artifacts.spec.ts` — existing patterns for protected endpoint e2e coverage and reviewer-artifact verification.

### Approaches
1. **Single `customer-assets` module** — one module coordinating customers, vehicles, and components together.
   - Pros: Fastest initial slice, centralized relation checks, fewer files up front.
   - Cons: Blurs domain ownership, grows into a large service/controller quickly, and scales worse when WorkOrders start depending on these resources separately.
   - Effort: Low/Medium

2. **Separate `customers`, `vehicles`, and `components` modules with shared conventions** — each resource gets its own controller/service/DTO/tests while the feature is still specified and documented as one customer-assets slice.
   - Pros: Matches the Prisma/domain nouns, scales better into future WorkOrder dependencies, keeps services smaller, and makes unit testing cleaner.
   - Cons: Slightly more scaffolding and cross-service relation wiring up front.
   - Effort: Medium

### Recommendation
Use **Approach 2**. Keep one feature spec/package (`customer-assets-crud`), but model it as three separate Nest modules because Customers, Vehicles, and Components are independent business nouns that WorkOrders will depend on separately.

Recommended v1 contract to carry into proposal/spec/design:
- **CRUD scope**: create, list, get-by-id, and update for `Customer`, `Vehicle`, and `Component`; NO delete endpoint in v1.
- **Access policy**: protect all customer-assets endpoints with `JwtAuthGuard`; allow `ADMIN` and `SALES` on create/update; keep `MECHANIC` out of scope for now because the business doc says mechanics are not guaranteed system users in v1. If mechanic read access is needed later, add it explicitly instead of assuming it now.
- **DTO validation**:
  - Customer: `name`, `phone`, `documentType`, `documentNumber` required; `email` optional and normalized; `notes` must be decided explicitly because the business doc includes it but Prisma does not.
  - Vehicle: `customerId`, `brand`, `modelReference`, `plate` required; `notes` optional; normalize `plate` to uppercase/trim before uniqueness checks.
  - Component: `customerId`, `brand`, `reference` required; `vehicleId`, `identifier`, and `notes` optional.
  - Keep validation PRACTICAL: trim strings and reject blanks, but avoid aggressive phone/document regex rules because the product explicitly values low-friction entry over bureaucracy.
- **Relation rules**:
  - Vehicle create/update MUST reference an existing customer.
  - Component create/update MUST reference an existing customer.
  - If `component.vehicleId` is provided, that vehicle MUST exist and belong to the same customer.
  - Prefer not to support silent cross-customer reassignment of vehicles/components in v1 unless the proposal explicitly accepts that traceability tradeoff.
- **Uniqueness and error handling**:
  - Customer duplicate on `(documentType, documentNumber)` → `409 Conflict`.
  - Vehicle duplicate `plate` → `409 Conflict`.
  - Missing parent or missing record → `404 Not Found`.
  - Cross-entity mismatch (for example, a component referencing another customer's vehicle) → `400 Bad Request`.
  - Map Prisma `P2002` to `409`, but do explicit service-level existence/relation checks first so errors stay understandable.
- **Pagination and search**:
  - Minimal list queries SHOULD support page/limit (or skip/take) with a sane max page size.
  - Customer search SHOULD cover `name`, `documentNumber`, and optionally `phone`.
  - Vehicle search SHOULD start with `plate`, `brand`, `modelReference`, plus optional `customerId` filtering.
  - Component search SHOULD start with `identifier`, `reference`, `brand`, plus optional `customerId` and `vehicleId` filtering.
  - No full-text requirement yet; the current schema lacks search-oriented indexes for most text fields, so keep v1 search simple and revisit indexes if lists grow.
- **Tests, docs, and Postman**:
  - Feature docs package under `docs/customer-assets/` mirroring the auth reviewer-doc style.
  - Importable Postman collection under `test/postman/mecanismos-dashboard-customer-assets.postman_collection.json`.
  - Unit tests for normalization, relation checks, and Prisma error mapping.
  - E2E tests for auth-protected create/list/get/update flows plus role enforcement.
  - Artifact tests verifying docs and Postman JSON presence/content, following the `src/auth/auth.artifacts.spec.ts` pattern.

### Risks
- `Customer` in Prisma does not currently include the business-doc `notes` field, so the proposal must decide NOW whether to add it or explicitly defer it; otherwise the API contract will drift.
- `RolesGuard` currently throws `Admin role required`, which becomes misleading as soon as `SALES` is allowed on protected routes.
- Search is needed for admin usability, but the current schema only has strong lookup constraints on customer document, vehicle plate, and component identifier index; broader text search may need later indexes.
- `openspec/config.yaml` is missing even though the OpenSpec tree exists, so downstream phases may need to restore project-level config rules.
- Customer/vehicle reassignment semantics are not modeled yet; getting this wrong can silently rewrite traceability before WorkOrders land.

### Ready for Proposal
Yes — enough is known to write proposal/spec/design artifacts for a create/read/update-only customer-assets slice with separate Nest modules, shared auth protection, pragmatic validation, explicit relation checks, and reviewer artifacts.
