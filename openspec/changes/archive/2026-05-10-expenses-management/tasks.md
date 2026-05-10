# Tasks: Expenses Management

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 700-950 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 -> PR 2 -> PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Contracts and module foundation | PR 1 | Base = main; DTO/module/repository contracts plus RED-first specs. |
| 2 | Protected expense lifecycle flow | PR 2 | Base = PR 1; repository/service/controller/e2e for create/list/get/update only. |
| 3 | Seeds and reviewer artifacts | PR 3 | Base = PR 2; seed wiring, docs, Postman, artifact verification. |

## Phase 1: Contracts and Foundation

- [x] 1.1 RED: add `src/expenses/dto/expense-dtos.spec.ts` for create/list/update validation, trimming, date parsing, enum rules, and `paymentMethod`-without-`paidAt` rejection.
- [x] 1.2 GREEN: implement `src/expenses/dto/create-expense.dto.ts`, `src/expenses/dto/update-expense.dto.ts`, and `src/expenses/dto/list-expenses-query.dto.ts` using generated enums only.
- [x] 1.3 RED: add `src/expenses/expenses.module.spec.ts` and `src/expenses/persistence/expenses.repository.spec.ts` for explicit `PrismaModule` wiring, `EXPENSES_PRISMA_CLIENT`, cost-center lookup, list filters, and `CostCenter` include.
- [x] 1.4 GREEN: create `src/expenses/expenses.module.ts` and `src/expenses/persistence/expenses.repository.ts`; update `src/app.module.ts` to register `ExpensesModule` only.

## Phase 2: Protected Lifecycle Flow

- [x] 2.1 RED: add `src/expenses/expenses.service.spec.ts` for create/update normalization, unknown expense or cost center `404`, paid/unpaid transitions, and clearing `paymentMethod` when unpaid.
- [x] 2.2 GREEN: implement `src/expenses/expenses.service.ts` with repository orchestration, pagination/filter passthrough, and no payroll/AP/reporting/work-order logic.
- [x] 2.3 RED: add `src/expenses/expenses.controller.spec.ts` and `test/expenses/expenses.e2e-spec.ts` for `401/403`, `POST/GET/PATCH /expenses`, missing id `404`, and unpaid `paymentMethod` `400`.
- [x] 2.4 GREEN: implement `src/expenses/expenses.controller.ts` with guarded Swagger routes and paginated responses matching the DTO contract.
- [x] 2.5 REFACTOR: keep helpers/types inside `src/expenses/` and remove any route or method that suggests delete, bonuses, payroll, reporting, AP, or work-order actuals.

## Phase 3: Seeds and Reviewer Artifacts

- [x] 3.1 RED: add `src/expenses/expenses.seed.spec.ts` for idempotent fixtures, cost-center-by-code resolution, and `prisma/seed.ts` ordering after default cost centers.
- [x] 3.2 GREEN: create `prisma/seed-expenses.ts` and update `prisma/seed.ts` with paid/unpaid fixtures, with/without `costCenterId`, using existing enums only.
- [x] 3.3 RED: add `src/expenses/expenses.artifacts.spec.ts` for `docs/expenses/overview.md`, `api-map.md`, `validation-rules.md`, `testing.md`, and `test/postman/mecanismos-dashboard-expenses.postman_collection.json`.
- [x] 3.4 GREEN: create those docs and Postman artifacts covering auth, lifecycle routes, cost-center validation, scheduled/paid semantics, and rollback notes.

## Phase 4: Verification

- [x] 4.1 Run targeted Jest coverage for the new `src/expenses/**/*.spec.ts` files first so RED/GREEN failures stay isolated.
- [x] 4.2 Run targeted e2e coverage for `test/expenses/expenses.e2e-spec.ts`, then let `sdd-apply` mark completed checkboxes in this file.
