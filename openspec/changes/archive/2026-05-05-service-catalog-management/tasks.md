# Tasks: Service Catalog Management

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650-900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Schema+shared slug → services slice → docs/tests/artifacts |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | `slug` schema + shared slugify + seed prep | Single PR | Base for all later work |
| 2 | `src/services/**` API + AppModule/Swagger wiring | Single PR | Depends on Unit 1 |
| 3 | Docs, Postman, unit/e2e, final lint/format | Single PR | Verifies reviewer flow |

## Dependencies

- Apply must run `npx prisma migrate dev` and `npx prisma generate` before relying on new Prisma types.
- `src/services/**` depends on `prisma/schema.prisma`, migration SQL, and `src/common/strings/slugify.ts`.
- Docs/Postman/e2e depend on final route names, DTOs, and response contract.

## Phase 1: Foundation

- [x] 1.1 Update `prisma/schema.prisma` for `ServiceCatalog.slug`, drop `name` uniqueness, and add lookup indexes for `name`/`isActive`.
- [x] 1.2 Create `prisma/migrations/*/migration.sql` as a reset/dev-oriented structural migration: add `slug`, drop `name` uniqueness, and create `slug`/`name`/`isActive` indexes without duplicating slug semantics in SQL.
- [x] 1.3 Update `prisma/seed.ts` to idempotently upsert representative services by slug while preserving existing IDs/relations.
- [x] 1.4 Create `src/common/strings/slugify.ts` and refactor `src/component-types/component-types.service.ts` to reuse it without behavior drift.

## Phase 2: Services Slice

- [x] 2.1 Generate `src/services/services.module.ts`, `services.controller.ts`, `services.service.ts`, `persistence/services.repository.ts`, and DTOs for create/update/list.
- [x] 2.2 Implement DTO trimming/validation in `src/services/dto/*.ts` for required `name`, optional `description`, pagination, search, and `isActive` parsing.
- [x] 2.3 Implement repository create/list/get/update with Prisma `slug` persistence, search over `name|slug|description`, and typed slug-conflict mapping.
- [x] 2.4 Implement controller/service auth flow for `ADMIN|SALES`, 401/403/404/409 handling, and register `ServicesModule` in `src/app.module.ts` plus Swagger tag in `src/main.ts`.

## Phase 3: Verification

- [x] 3.1 Add `src/services/services.service.spec.ts` and `src/services/persistence/services.repository.spec.ts` for slug regeneration, optional-string normalization, 404/409 mapping, and list filters.
- [x] 3.2 Add `src/services/services.controller.spec.ts` and `test/services/services.e2e-spec.ts` for allowed roles, unauthenticated 401, forbidden `MECHANIC`, happy paths, duplicate 409, and missing-id 404.
- [x] 3.3 Add `src/services/services.artifacts.spec.ts`, `docs/services/{overview,api-map,validation-rules,testing}.md`, and `test/postman/mecanismos-dashboard-services.postman_collection.json` with executable reviewer flows using real created IDs.

## Phase 4: Final Verification and Rollback

- [x] 4.1 Verify apply runs `npm run lint` and `npm run format`, plus targeted tests for service unit specs and `test/services/services.e2e-spec.ts`.
- [x] 4.2 Document rollback order in `docs/services/testing.md`: remove runtime/docs/Postman artifacts first, then revert slug migration before downstream reuse depends on `/services`.
