# Tasks: Cost Centers Management

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 520-760 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | RED+foundation → API slice → docs/artifacts/e2e |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No (resolved to stacked-to-main)
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Test harness + seeds + DTO/query contracts | PR 1 | Base slice; no business flow yet |
| 2 | Repository/service/controller lifecycle API | PR 2 | Depends on PR 1; create/list/get/update only |
| 3 | Reviewer docs, Postman, e2e, rollback notes | PR 3 | Depends on PR 2; closes review flow |

## Phase 1: Foundation

- [x] 1.1 Create `src/cost-centers/` skeleton: module, controller, service, `dto/`, and `persistence/` with `COST_CENTERS_PRISMA_CLIENT` wired through explicit `PrismaModule`.
- [x] 1.2 Add `src/cost-centers/dto/{create,update,list}-cost-center*.ts` contracts for trimmed `code`/`name`, optional `isActive`, and paginated `search` + `isActive` filters.
- [x] 1.3 Update `prisma/seed.ts` to idempotently upsert `GENERAL`, `BODEGA`, and `OFICINA` by canonical `code`, without touching employee/expense/reporting/work-order flows.

## Phase 2: RED

- [x] 2.1 Write `src/cost-centers/cost-centers.service.spec.ts` first for canonical `code`, default active state, duplicate `409`, missing-id `404`, and deactivate-via-update scenarios.
- [x] 2.2 Write `src/cost-centers/persistence/cost-centers.repository.spec.ts` first for Prisma list filters, name/code search, default name sort, and `P2002` conflict mapping.
- [x] 2.3 Write `src/cost-centers/cost-centers.controller.spec.ts` first for `ADMIN|SALES`, `JwtAuthGuard` + `RolesGuard`, route metadata, delegation, and `AppModule` import wiring.
- [x] 2.4 Write `src/cost-centers/cost-centers.artifacts.spec.ts` first for required docs and `test/postman/mecanismos-dashboard-cost-centers.postman_collection.json` routes.

## Phase 3: GREEN + REFACTOR

- [x] 3.1 Implement `src/cost-centers/persistence/cost-centers.repository.ts` create/list/find/update methods with Prisma `costCenter`, pagination meta inputs, and typed duplicate handling.
- [x] 3.2 Implement `src/cost-centers/cost-centers.service.ts` normalization, lifecycle defaults, `404/409` translation, and response shaping; refactor only after RED tests pass.
- [x] 3.3 Implement `src/cost-centers/cost-centers.controller.ts` for `POST /cost-centers`, `GET /cost-centers`, `GET /cost-centers/:id`, and `PATCH /cost-centers/:id`; do not add delete.
- [x] 3.4 Register `CostCentersModule` in `src/app.module.ts` and keep scope isolated to cost-center catalog behavior only.

## Phase 4: Verification + Reviewer Artifacts

- [x] 4.1 Add `docs/cost-centers/{overview,api-map,validation-rules,testing}.md` with auth rules, canonical-code behavior, seed expectations, and rollback order.
- [x] 4.2 Create `test/postman/mecanismos-dashboard-cost-centers.postman_collection.json` covering login, create, duplicate conflict, list filter, get, update/deactivate, and forbidden access.
- [x] 4.3 Add `test/cost-centers/cost-centers.e2e-spec.ts` for `401`, `403`, happy-path lifecycle, duplicate `409`, and missing-id `404` without broadening feature scope.
- [x] 4.4 Run `npm run lint`, `npm run test`, and `npm run test:e2e`; fix only cost-center failures and keep generated Prisma files untouched.
