# Proposal: Employees Management

## Intent

Add runtime support for the existing employee domain so admins can manage an employee catalog, salary baseline fields, and manual employee-owned bonuses without expanding into payroll, reporting, or work-order analytics.

## Scope

### In Scope
- Dedicated `EmployeesModule` with guarded CRUD-lite employee catalog endpoints.
- Employee-owned bonus endpoints over existing `EmployeeBonus` records.
- Optional `costCenterId` association to existing cost centers; consume only.
- Idempotent seed fixtures for representative employees and bonuses if useful.

### Out of Scope
- Expenses, payroll projection beyond `baseSalaryMonthly`, reporting, work orders, mechanic productivity dashboards.
- Inline cost-center create/update.
- Prisma schema changes unless implementation proves an existing model mismatch.

## Capabilities

### New Capabilities
- `employees-management`: Protected employee catalog lifecycle, optional cost-center association, employee-owned manual bonuses, seeds, and reviewer verification.

### Modified Capabilities
- None.

## Approach

Implement a feature-local `src/employees/` module following `Controller -> Service -> Repository -> Prisma`, importing explicit non-global `PrismaModule`. Prefer active/inactive lifecycle over delete-first behavior to protect history. Model bonuses as nested employee-owned routes/subresources, not as a separate top-level payroll/reporting feature.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/employees/` | New | Module, controller, service, repository, DTOs, tests, artifacts. |
| `src/app.module.ts` | Modified | Import `EmployeesModule`. |
| `prisma/seed.ts` | Modified | Add idempotent employees/bonuses fixtures. |
| `docs/employees/*` | New | Reviewer-facing usage docs if matching project convention. |
| `test/employees/*`, `test/postman/*employees*` | New | Critical HTTP/manual verification artifacts. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scope creep into payroll/reporting/work orders | Med | Keep specs limited to employee catalog and manual bonuses. |
| Dangerous delete semantics remove bonus history or null work-order links | Med | Prefer no hard delete in v1; use active/inactive lifecycle. |
| Cost-center boundary blur | Low | Accept only `costCenterId`; reject inline cost-center mutation. |

## Rollback Plan

Remove `EmployeesModule` import and `src/employees/`, revert seed/docs/test artifacts. No migration rollback should be required if schema remains unchanged.

## Dependencies

- Existing Prisma `Employee`, `EmployeeBonus`, and `CostCenter` models.
- Existing auth/authorization and cost-center catalog behavior.

## Success Criteria

- [ ] Authenticated authorized users can create/list/get/update employees with optional `costCenterId`.
- [ ] Employee-owned bonus records can be created/listed without payroll/reporting behavior.
- [ ] Seeds are idempotent and make local review practical.
- [ ] Tests/artifacts verify protection, validation, lifecycle, and ownership boundaries.
