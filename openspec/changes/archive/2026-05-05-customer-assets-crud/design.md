# Design: Customer Assets CRUD

## Technical Approach

Implement one change package as three Nest resource modules: `CustomersModule`, `VehiclesModule`, and `ComponentsModule`. Each module owns its controller, DTOs, service, and persistence-facing repository/provider usage, while reusing shared auth (`JwtAuthGuard`, `RolesGuard`, `@Roles()`) and the existing `PrismaService`. This keeps the v1 slice aligned with Prisma/business nouns and avoids a single oversized `customer-assets` service.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Feature shape | Three modules under one change | Single `customer-assets` module | Matches domain boundaries and future WorkOrder dependencies; cleaner DI/tests. |
| Persistence boundary | Resource services call thin resource repositories backed by `PrismaService` | Direct Prisma calls inside services | Repository seam keeps Prisma query rules testable and consistent with existing auth persistence style. |
| Ownership policy | `customerId` immutable after create for vehicles/components; component `vehicleId` may change only within same customer | Allow reassignment | Reassignment rewrites traceability and could enable SALES-driven metric falsification. |
| Role model | Protect all routes with JWT; allow `ADMIN` + `SALES` for customer-assets v1 | Admin-only or mechanic access | Meets requested scope while keeping MECHANIC out and preserving auth v1 simplicity. |
| Error contract | Service-level relation checks first; Prisma `P2002` mapped to `409` | Raw Prisma errors | Produces reviewer-friendly, deterministic API behavior. |

## Data Flow

`Controller -> DTO Validation/transform -> Service -> Repository/Prisma -> DB`

Create/update flows add relation guards before persistence:

`vehicle.customerId -> Customer exists`

`component.customerId -> Customer exists -> if vehicleId: Vehicle exists AND Vehicle.customerId matches component.customerId`

## File Changes

| File | Action | Description |
|---|---|---|
| `src/app.module.ts` | Modify | Register `CustomersModule`, `VehiclesModule`, `ComponentsModule`. |
| `src/auth/roles.guard.ts` | Modify | Replace admin-only forbidden text with generic allowed-roles message/helper. |
| `prisma/schema.prisma` | Modify | Add `Customer.notes String?`. |
| `prisma/migrations/*_customer_notes/migration.sql` | Create | SQL migration adding nullable `notes` column. |
| `src/customers/**` | Create | Module, controller, service, repository, DTOs, unit tests. |
| `src/vehicles/**` | Create | Same pattern plus immutable `customerId` update rules. |
| `src/components/**` | Create | Same pattern plus same-customer `vehicleId` enforcement. |
| `docs/customer-assets/*.md` | Create | Overview, API map, validation/rules, testing/Postman guide. |
| `test/customer-assets/*.e2e-spec.ts` | Create | Protected CRUD-lite endpoint coverage. |
| `test/postman/mecanismos-dashboard-customer-assets.postman_collection.json` | Create | Importable manual verification artifact. |
| `src/customer-assets/customer-assets.artifacts.spec.ts` or resource-adjacent artifact spec | Create | Validate docs/Postman presence and key request paths. |

## Interfaces / Contracts

Routes:
- `POST /customers`, `GET /customers`, `GET /customers/:id`, `PATCH /customers/:id`
- `POST /vehicles`, `GET /vehicles`, `GET /vehicles/:id`, `PATCH /vehicles/:id`
- `POST /components`, `GET /components`, `GET /components/:id`, `PATCH /components/:id`

Guards/decorators: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('ADMIN', 'SALES')` on all customer-assets endpoints.

List query shape:
```ts
type PageQuery = { page?: number; limit?: number; search?: string };
```
Resource filters extend it:
- customers: `documentType?`
- vehicles: `customerId?`
- components: `customerId?`, `vehicleId?`

Normalization/validation:
- trim all string inputs; reject blank required values
- lowercase `email`; uppercase `plate`
- `notes` stored as nullable string; rich text is opaque v1 content
- update DTOs MUST omit `customerId` for vehicles/components; component update MAY include `vehicleId` only to set/clear same-customer linkage

Error mapping:
- `404` missing resource/parent
- `400` cross-customer vehicle/component mismatch
- `409` duplicate customer document or vehicle plate

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | DTO normalization helpers, service relation checks, repository error mapping | Jest with mocked repositories/Prisma errors. |
| Integration-ish unit | Repository query shapes | Mock Prisma client like auth persistence tests. |
| E2E | Auth protection, ADMIN/SALES access, MECHANIC rejection, create/list/get/update contracts | New Prisma-free controller/service-mocked e2e specs following `test/auth/auth.e2e-spec.ts` style. |
| Artifact | Docs/Postman completeness | Spec mirroring `src/auth/auth.artifacts.spec.ts`. |

## Migration / Rollout

Add nullable `Customer.notes` via Prisma schema + migration, then run `npx prisma generate`. No data backfill required. Swagger gains tags `customers`, `vehicles`, `components`; `src/main.ts` should expand API description to mention customer-assets.

## Open Questions

- [ ] None blocking; ready for `sdd-tasks`.
