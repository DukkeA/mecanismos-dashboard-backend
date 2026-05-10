# Tasks: Employees Management

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900-1300 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 employee catalog foundation -> PR 2 bonus + seed flows -> PR 3 docs + reviewer verification |
| Delivery strategy | ask-on-risk (pre-resolved to chained slices on high risk) |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Employee CRUD-lite + cost-center reference contract | PR 1 | Base from main; merge before bonus slice. |
| 2 | Employee-owned bonus flows + idempotent seeds | PR 2 | Start after PR 1 shape is stable. |
| 3 | E2E, docs, Postman, artifact verification | PR 3 | Reviewer-focused closeout after runtime paths exist. |

## Phase 1: RED - lock the contracts

- [x] 1.1 Add `src/employees/dto/employee-dtos.spec.ts` for create/update/list employee and bonus query validation, defaults, and bounds.
- [x] 1.2 Add `src/employees/employees.service.spec.ts` for create/list/get/update, missing employee, missing cost center, deactivate, and missing employee bonus scenarios.
- [x] 1.3 Add `src/employees/persistence/employees.repository.spec.ts` for Prisma filter args, cost-center lookup, nested bonus writes, and `paidAt desc` listing.
- [x] 1.4 Add `test/employees/employees.e2e-spec.ts` RED cases for `401/403`, employee CRUD-lite, cost-center reference listing, and nested bonus routes with Prisma-free overrides.

## Phase 2: GREEN - employee catalog foundation

- [x] 2.1 Create `src/employees/employees.module.ts`, `employees.controller.ts`, `employees.service.ts`, and `persistence/employees.repository.ts`; wire explicit `PrismaModule` and import `EmployeesModule` in `src/app.module.ts`.
- [x] 2.2 Implement `src/employees/dto/create-employee.dto.ts`, `update-employee.dto.ts`, `list-employees-query.dto.ts`, `create-employee-bonus.dto.ts`, and `list-employee-bonuses-query.dto.ts` to satisfy validation specs.
- [x] 2.3 Implement `POST/GET/GET:id/PATCH /employees` plus read-only cost-center options in controller/service/repository, keeping scope employees-only and no delete route.

## Phase 3: GREEN/REFACTOR - employee-owned bonuses and seeds

- [x] 3.1 Implement `POST /employees/:id/bonuses` and `GET /employees/:id/bonuses` in the same controller/service/repository seam, rejecting unknown employees with `404`.
- [x] 3.2 Refactor service/repository helpers for pagination meta, trimming/defaults, and exception mapping without expanding into payroll, expenses, or reporting fields.
- [x] 3.3 Add `src/employees/employees.seed.spec.ts` and extend `prisma/seed.ts` with stable employee and bonus upserts after default cost centers.

## Phase 4: Verification artifacts

- [x] 4.1 Add `src/employees/employees.controller.spec.ts`, `employees.module.spec.ts`, and `employees.artifacts.spec.ts` for guard wiring plus required docs/Postman snippets.
- [x] 4.2 Create `docs/employees/overview.md`, `api-map.md`, `validation-rules.md`, `testing.md`, and `test/postman/mecanismos-dashboard-employees.postman_collection.json` with explicit reviewer path and rollback notes.
- [x] 4.3 Turn `test/employees/employees.e2e-spec.ts` GREEN and verify all spec scenarios stay covered without modifying the shared smoke test.
