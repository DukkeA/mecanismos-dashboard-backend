## Exploration: employees-management

### Current State
- Prisma ALREADY models `Employee` and `EmployeeBonus` in `prisma/schema.prisma`, so this is not a greenfield data model. `Employee` has `name`, `type`, optional `phone`, `baseSalaryMonthly`, optional `costCenterId`, `isActive`, and timestamps. `EmployeeBonus` stores manual bonus payments with `amount`, optional `description`, `paidAt`, and optional `paymentMethod`.
- The baseline SQL migration already creates `CostCenter`, `Employee`, and `EmployeeBonus`, with `Employee.costCenterId -> CostCenter.id` using `ON DELETE SET NULL` and `EmployeeBonus.employeeId -> Employee.id` using `ON DELETE CASCADE`. `WorkOrder.assignedEmployeeId` also already points to `Employee` with `ON DELETE SET NULL`.
- Runtime support is MISSING today: there is no `src/employees/` feature, no employee controller/service/repository/tests, and no employee reviewer docs or Postman artifact.
- The current backend pattern is stable and should be reused: feature-local module/controller/service/repository folders, explicit `PrismaModule` import, DI token bound with `useExisting: PrismaService`, guarded controllers, DTO validation, paginated list responses, and reviewer-facing docs/tests (`src/cost-centers/*`, `src/suppliers/*`, `test/cost-centers/*`).
- `docs/business-context.md` makes the business boundary explicit: employees are business entities, not login users; bonuses are manual and sporadic; monthly payroll projection for v1 uses ONLY `baseSalaryMonthly`; productivity/reporting belongs to future work and should not be folded into this slice.
- `openspec/config.yaml` does not exist in the repo, so exploration can rely on existing OpenSpec folder conventions and real project code/specs, but there is no additional per-phase config to inherit.

### Affected Areas
- `prisma/schema.prisma` — source of truth for `Employee`, `EmployeeBonus`, `CostCenter`, and `WorkOrder.assignedEmployeeId`.
- `prisma/migrations/20260504065151_add_business_domain/migration.sql` — confirms existing tables and delete/nullability behavior that future API rules must respect.
- `src/app.module.ts` — future import point for a dedicated `EmployeesModule`.
- `src/cost-centers/*` — strongest reference for keeping cost centers as a separate classifier feature while exposing only `costCenterId` from employees.
- `src/suppliers/*` and `src/customers/*` — reference pattern for guarded CRUD modules, DTO validation, pagination envelopes, and repository/service separation.
- `prisma/seed.ts` — future apply work should add representative, idempotent employee sample data without coupling to expenses/reporting/work orders.
- `docs/business-context.md` — business rules for employee ownership, bonus behavior, payroll projection scope, and reporting non-goals.
- `docs/employees/*`, `src/employees/*.artifacts.spec.ts`, `test/employees/*`, `test/postman/*employees*` — likely new reviewer/testing artifacts needed to match current project conventions.

### Approaches
1. **Dedicated `employees` module with nested bonus ownership** — add a single `src/employees/` feature that manages employee lifecycle plus employee-owned bonus records, while treating `costCenterId` as an optional reference to the existing cost-centers catalog.
   - Pros: Best fit for the requested boundary; matches the existing schema; keeps employees separate from expenses/reporting/work orders; makes the salary-vs-bonus distinction explicit in one feature; preserves modular NestJS structure.
   - Cons: Slightly broader than a plain CRUD because bonus routes and repository methods need their own validation and persistence rules; needs careful API scoping so bonuses do not turn into payroll/reporting.
   - Effort: Medium

2. **Employee lifecycle first, defer explicit bonus APIs** — implement only employee CRUD/list/get/update now and leave `EmployeeBonus` as a future slice.
   - Pros: Smaller first delivery; lower implementation and review load; can ship basic employee assignment and cost-center linkage quickly.
   - Cons: Undershoots the stated intent that employees own both monthly salary and bonuses; forces a near-immediate follow-up change for a core business rule; weakens the domain boundary by leaving ownership half-implemented.
   - Effort: Low

### Recommendation
Use **Approach 1**.

Recommended direction for proposal/spec/design:
- Implement a dedicated `EmployeesModule` over the EXISTING `Employee` and `EmployeeBonus` tables.
- Keep the feature boundary STRICT: employees own `baseSalaryMonthly`, `isActive`, optional `costCenterId`, and manual bonus records; do not mix in expenses, payroll projection engines, reporting dashboards, or work-order profitability calculations.
- Treat `costCenterId` as a reference to the already separate `cost-centers` feature. Employees may point to a cost center, but this change should not manage cost centers inline.
- Prefer employee lifecycle routes plus employee-owned bonus routes/subresources so ownership is explicit without creating a separate top-level bonuses module.
- Preserve history: for v1, prefer active/inactive lifecycle for employees and avoid delete-first behavior that could null work-order assignments or cascade-remove bonus history.
- Add representative seed data so reviewers can exercise employee and bonus flows immediately after `prisma db seed`.

### Risks
- Scope creep into payroll, expenses, reporting, or mechanic productivity would violate the requested feature boundary and likely exceed the review budget.
- If delete behavior is exposed casually, current FK rules would null `WorkOrder.assignedEmployeeId` and cascade-delete `EmployeeBonus`, which is dangerous for historical traceability.
- If bonus APIs are modeled as a separate top-level feature, the code will fight the business rule that bonuses are owned by employees.
- If the change couples employee creation to cost-center creation or editing, it will blur the boundary with the already separate `cost-centers` module.
- If seed/test coverage is skipped, local reviewers will have a hard time validating the feature because there are no employee fixtures today.

### Ready for Proposal
Yes — enough is known to propose a focused `employees` feature on top of the existing Prisma models, with employee lifecycle + employee-owned bonuses, optional `costCenterId` linkage, and explicit exclusion of payroll/reporting/expenses/work-order profitability scope.
