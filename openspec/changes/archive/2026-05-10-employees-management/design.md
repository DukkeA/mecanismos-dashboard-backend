# Design: Employees Management

## Technical Approach

Implement `employees-management` as a feature-local NestJS module under `src/employees/`, mirroring `cost-centers`, `services`, and `suppliers`: guarded controller, service orchestration, repository persistence seam, DTO validation, unit tests, e2e, docs, and Postman reviewer artifact. Use the existing Prisma `Employee`, `EmployeeBonus`, `EmployeeType`, `PaymentMethod`, and optional `CostCenter` relation; no schema migration is planned. The proposal exists; no delta spec was available during design.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Module boundary | Create `EmployeesModule` with explicit `PrismaModule` import and `EMPLOYEES_PRISMA_CLIENT` token. | Add endpoints to cost-centers or a payroll module. | Keeps the existing modular monolith shape and avoids payroll/reporting scope creep. |
| API shape | `POST /employees`, `GET /employees`, `GET /employees/:id`, `PATCH /employees/:id`, `POST /employees/:id/bonuses`, `GET /employees/:id/bonuses`. | Top-level `/employee-bonuses`. | Bonuses are employee-owned subresources and must not become a payroll/reporting feature. |
| Lifecycle | No hard delete in v1; `PATCH` toggles `isActive`. | `DELETE /employees/:id`. | Protects `WorkOrder` links and bonus history; follows cost-center/service active lifecycle. |
| Cost centers | Accept optional `costCenterId`; repository validates existence through `costCenter.findUnique`, service maps missing references to `BadRequestException` or `NotFoundException`. | Inline cost-center creation/update. | Preserves cost-center ownership boundary while keeping employee references valid. |
| Persistence | Repository returns Prisma records with optional `CostCenter` include and nested bonus records ordered by `paidAt desc`. | Controllers call Prisma directly. | Maintains `Controller -> Service -> Repository -> Prisma` and testable seams. |

## Data Flow

```text
HTTP + cookie auth
  -> EmployeesController (@Roles ADMIN | SALES)
  -> EmployeesService (trim/default/ownership validation)
  -> EmployeesRepository (Prisma Employee, EmployeeBonus, CostCenter lookup)
  -> generated Prisma client
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/employees/employees.module.ts` | Create | Imports `PrismaModule`, wires controller/service/repository token. |
| `src/employees/employees.controller.ts` | Create | Guarded employee and nested bonus HTTP endpoints. |
| `src/employees/employees.service.ts` | Create | Business rules: lifecycle, cost-center reference, pagination response, bonus ownership. |
| `src/employees/persistence/employees.repository.ts` | Create | Prisma seam for employees, bonuses, and cost-center lookup. |
| `src/employees/dto/*.ts` | Create | Create/update/list employee DTOs and create/list bonus DTOs. |
| `src/employees/*.spec.ts` | Create | Controller/service/module/artifact tests. |
| `src/employees/persistence/*.spec.ts` | Create | Repository filter, include, and write behavior tests. |
| `src/app.module.ts` | Modify | Import `EmployeesModule`. |
| `prisma/seed.ts` | Modify | Add idempotent seed employees and bonuses after default cost centers. |
| `docs/employees/*.md` | Create | Overview, API map, validation, testing guide like services. |
| `test/employees/employees.e2e-spec.ts` | Create | Guarded endpoint flow using service override. |
| `test/postman/mecanismos-dashboard-employees.postman_collection.json` | Create | Runner-ready manual verification. |

## Interfaces / Contracts

- Employee fields: `name`, `type: EmployeeType`, optional `phone`, `baseSalaryMonthly >= 0`, optional `costCenterId`, optional `isActive`.
- List employee query: `page`, `limit`, `search`, `type`, `isActive`, `costCenterId`.
- Bonus fields: `amount > 0`, optional `description`, `paidAt`, optional `paymentMethod: PaymentMethod`.
- List bonus query: `page`, `limit`, optional `from`, `to` over `paidAt`.
- Responses follow existing `{ data, meta }` pagination shape for collection endpoints.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | DTO transforms/validation, service normalization, missing employee/cost center, bonus ownership. | Jest specs with mocked repository. |
| Repository | Prisma args for filters/includes, UUID/timestamps, nested bonus create/list. | Typed fake Prisma clients as in cost-centers/services. |
| E2E | 401/403, ADMIN/SALES employee CRUD-lite, inactive toggle, bonus create/list, validation/404. | AppModule with `EmployeesService` override; keep Prisma mocked. |
| Artifacts | Docs and Postman collection existence/content. | Artifact spec mirroring services. |

## Migration / Rollout

No migration required. Seed records use stable IDs and upserts; rollback removes module import, `src/employees/`, seed additions, docs, Postman, and e2e files.

## Open Questions

None.
