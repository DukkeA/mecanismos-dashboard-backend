# Design: Cost Centers Management

## Technical Approach

Add a focused NestJS catalog slice over the existing Prisma `CostCenter` model. The implementation mirrors `services` and `component-types`: guarded controller, service business rules, Prisma-backed repository adapter, paginated list shape, idempotent seed data, and reviewer docs/Postman artifacts. No Prisma schema change is planned because `CostCenter.code` is already unique and downstream relations already exist.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Module boundary | Dedicated `src/cost-centers/` module imported by `AppModule` | Fold into expenses/employees | Keeps this change as a reusable classifier catalog and avoids scope creep. |
| Persistence path | `Controller -> Service -> Repository -> Prisma` with an explicit `COST_CENTERS_PRISMA_CLIENT` token using `PrismaService` | Controller/service direct Prisma access | Matches existing catalog slices and keeps persistence isolated for tests. |
| Lifecycle | `PATCH` toggles `isActive`; no `DELETE` route | Hard delete | Existing FKs can null future `Employee`/`Expense` links on delete, weakening historical classification. |
| Canonical key | Normalize `code` with `trim().toUpperCase()` before create/update and map Prisma `P2002` to `409 Conflict` | Trust client casing | Prevents near-duplicates like `general` vs `GENERAL`. |
| Seed strategy | Upsert `GENERAL`, `BODEGA`, `OFICINA` by unique `code` | Runtime-only creation | Reviewers can exercise the feature immediately after `prisma db seed`. |

## Data Flow

```text
HTTP /cost-centers
  -> CostCentersController (JwtAuthGuard + RolesGuard, ADMIN | SALES)
  -> CostCentersService (normalization, 404/409 mapping, pagination meta)
  -> CostCentersRepository (Prisma query shape, UUIDs, write error mapping)
  -> PrismaService.costCenter
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/cost-centers/cost-centers.module.ts` | Create | Imports `PrismaModule`, registers controller/service/repository/token. |
| `src/cost-centers/cost-centers.controller.ts` | Create | Protected `POST`, `GET`, `GET :id`, `PATCH :id`; no delete. |
| `src/cost-centers/cost-centers.service.ts` | Create | Normalizes code/name, builds paginated response, throws `NotFoundException`/`ConflictException`. |
| `src/cost-centers/persistence/cost-centers.repository.ts` | Create | Prisma adapter for `costCenter` CRUD-lite and list filters. |
| `src/cost-centers/dto/*.dto.ts` | Create | `CreateCostCenterDto`, `UpdateCostCenterDto`, `ListCostCentersQueryDto`. |
| `src/cost-centers/*.spec.ts` | Create | Controller/service/artifact tests. |
| `src/cost-centers/persistence/*.spec.ts` | Create | Repository query/write-error tests. |
| `src/app.module.ts` | Modify | Import `CostCentersModule`. |
| `prisma/seed.ts` | Modify | Add idempotent default cost centers. |
| `docs/cost-centers/*.md` | Create | Overview, API map, validation rules, testing guide. |
| `test/postman/mecanismos-dashboard-cost-centers.postman_collection.json` | Create | Runner-ready reviewer collection. |

## Interfaces / Contracts

Routes use the existing cookie auth and `ADMIN | SALES` role pattern.

```ts
POST /cost-centers { code: string; name: string; isActive?: boolean }
GET /cost-centers?page=1&limit=10&search=general&isActive=true
GET /cost-centers/:id
PATCH /cost-centers/:id Partial<{ code: string; name: string; isActive: boolean }>
```

List responses follow existing catalog shape: `{ data: CostCenterRecord[], meta: { page, limit, total, totalPages } }`. Search should match `code` and `name` case-insensitively; default sort should be `{ name: 'asc' }`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Service normalization, pagination meta, 404 and 409 mapping | Direct mocked repository tests like `services.service.spec.ts`. |
| Repository | Prisma `where`, pagination, UUID/update timestamps, `P2002` mapping | Mock minimal `costCenter` client. |
| Controller | Route metadata, guards/roles, `AppModule` wiring, method delegation | Reflection tests matching `services.controller.spec.ts`. |
| Artifacts | Docs and Postman collection exist with expected routes/conflict flow | Artifact spec matching existing catalog patterns. |

## Migration / Rollout

No migration required. Existing schema and migration already create `CostCenter`; rollout is adding the NestJS feature, seeds, docs, and tests.

## Open Questions

None.
