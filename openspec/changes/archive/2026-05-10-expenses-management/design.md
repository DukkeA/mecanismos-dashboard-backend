# Design: Expenses Management

## Technical Approach

Implement `expenses-management` as a dedicated protected NestJS feature that mirrors the adjacent `employees` and `cost-centers` patterns: `Controller -> Service -> Repository -> Prisma`, explicit `PrismaModule`, repository-owned Prisma adapter token, Swagger metadata, and Jest coverage at controller/service/repository/artifact/seed/e2e layers. No Prisma schema change is required; the existing `Expense`, `ExpenseCategory`, `PaymentMethod`, and optional `CostCenter` relation are the contract. No delta spec was available during design, so this maps to the proposal scope.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Module boundary | Create `src/expenses/` with module/controller/service/repository/DTOs | Fold into cost centers or procurement | Expenses are operational overhead, not cost-center management, payroll, AP, or work-order costs. A feature module keeps scope obvious. |
| Cost-center validation | Service validates optional `costCenterId` through repository `findCostCenterById`; omitted remains allowed | Rely on FK error only; import `CostCentersService` | Matches `EmployeesService`, gives intentional `404`, and avoids feature coupling beyond Prisma read. |
| Payment semantics | `expectedAt` required; paid state is `paidAt !== null`; `paymentMethod` is persisted only when paid | Add status enum; require payment method always | Proposal forbids schema changes. Derived status avoids duplicate state while keeping unpaid scheduled expenses valid. |
| API shape | `POST /expenses`, `GET /expenses`, `GET /expenses/:id`, `PATCH /expenses/:id`; no delete | Nested under cost centers; add reporting endpoints | The feature is lifecycle CRUD only; delete/reporting/AP are explicitly out of scope. |
| Seeds/artifacts | Add `prisma/seed-expenses.ts`, docs, Postman, artifact spec | Inline all seed data in `seed.ts` only | Adjacent employees moved domain seed logic to a helper and verifies docs/Postman with artifact specs. |

## Data Flow

```text
HTTP /expenses ──guards──> ExpensesController
  └── DTO ValidationPipe transforms dates/enums/numbers
      └── ExpensesService trims fields, enforces cost-center/payment rules
          └── ExpensesRepository builds Prisma queries/includes
              └── Prisma Expense + optional CostCenter
```

List flow returns `{ data, meta }` via `buildPaginationMeta`, with filters for `search`, `category`, `costCenterId`, paid/unpaid, expected date window, and paid date window. Records should include `CostCenter` like employees include it.

## File Changes

| File | Action | Description |
|---|---:|---|
| `src/expenses/expenses.module.ts` | Create | Imports `PrismaModule`, binds `EXPENSES_PRISMA_CLIENT` to `PrismaService`. |
| `src/expenses/expenses.controller.ts` | Create | Guarded ADMIN/SALES routes and Swagger docs for create/list/get/update. |
| `src/expenses/expenses.service.ts` | Create | Business normalization, `NotFoundException`, cost-center and payment consistency rules. |
| `src/expenses/persistence/expenses.repository.ts` | Create | Prisma `expense` CRUD, list filters, `CostCenter` include, cost-center lookup. |
| `src/expenses/dto/*.ts` | Create | Create/update/list DTOs using generated enums and date/number transforms. |
| `src/expenses/*.spec.ts` | Create | Controller, service, DTO/artifact/seed specs. |
| `src/app.module.ts` | Modify | Import `ExpensesModule`. |
| `prisma/seed-expenses.ts` | Create | Idempotent paid/unpaid fixtures; resolves cost centers by code. |
| `prisma/seed.ts` | Modify | Run expense seed after default cost centers. |
| `docs/expenses/*.md`, `test/postman/*expenses*.json` | Create | Reviewer-facing usage and runnable API collection. |
| `test/expenses/expenses.e2e-spec.ts` | Create | Mock-service e2e consistent with employees. |

## Interfaces / Contracts

- `CreateExpenseDto`: `name`, `category`, `amount`, `expectedAt`, optional `costCenterId`, `paidAt`, `paymentMethod`, `notes`.
- `UpdateExpenseDto`: partial create fields.
- `ListExpensesQueryDto`: `page`, `limit`, `search`, `category`, `costCenterId`, `isPaid`, `expectedFrom`, `expectedTo`, `paidFrom`, `paidTo`.
- Response record: Prisma `Expense` plus `CostCenter: { id, code, name, isActive } | null`.

Payment rule: if `paidAt` is absent/null, persist `paymentMethod: null`; if `paymentMethod` is provided without `paidAt`, reject with `BadRequestException` to prevent fake payment data.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Service normalization, not found, payment rules, cost-center validation | Mock repository like `employees.service.spec.ts`. |
| Repository | Create/update data, filters, pagination, `CostCenter` include | Typed fake Prisma calls like adjacent repository specs. |
| Controller/DTO | Guards, routes, module wiring, enum/date/int validation | Reflect metadata and DTO specs. |
| E2E | Auth/role access, create/list/get/update, 404/400 cases | Mock `ExpensesService` and use cookie JWT pattern from employees e2e. |

## Migration / Rollout

No migration required. Rollout is additive: register `ExpensesModule`, seed fixtures, docs, and Postman artifacts. Rollback removes those files/imports and seed wiring only.

## Open Questions

None.
