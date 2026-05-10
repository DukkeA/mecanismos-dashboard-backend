# Proposal: Expenses Management

## Intent

Expose operational expense management over the existing Prisma `Expense` model so admins can schedule and record paid overhead without mixing expenses into payroll, work-order costs, reporting, or accounts-payable workflows.

## Scope

### In Scope
- Dedicated protected NestJS `expenses` feature/module with create, list, get, and update endpoints.
- Optional `costCenterId` association validated against the existing cost-center catalog; no inline cost-center management.
- Expense scheduling/payment contract: `expectedAt` required; paid state derived from `paidAt`; `paymentMethod` optional and only meaningful when paid.
- Idempotent expense seed fixtures covering paid/unpaid and with/without cost center examples.

### Out of Scope
- Delete route, employee bonuses/payroll, work-order actual costs, reporting, and accounts-payable workflows.
- Prisma schema/category changes; `almuerzos`-style examples use `OTHER` plus descriptive `name`/`notes` in v1.

## Capabilities

### New Capabilities
- `expenses-management`: Protected operational-expense lifecycle, cost-center reference validation, scheduling/payment semantics, and reviewer-ready seeds/artifacts.

### Modified Capabilities
- None.

## Approach

Reuse the existing modular NestJS pattern: `src/expenses/` owns module, controller, service, repository, DTOs, and tests; the module imports explicit `PrismaModule`; flow remains `Controller -> Service -> Repository -> Prisma`. Build on the existing `Expense`, `ExpenseCategory`, and `PaymentMethod` schema without migrations unless later specs explicitly require category expansion.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/expenses/` | New | Feature module, guarded API, DTO validation, service rules, Prisma repository, tests. |
| `src/app.module.ts` | Modified | Import `ExpensesModule`. |
| `prisma/seed.ts`, `prisma/seed-expenses.ts` | Modified/New | Add idempotent fixtures after cost centers exist. |
| `docs/expenses/*`, `test/postman/*expenses*` | New | Reviewer-facing API usage and executable artifacts. |
| `openspec/specs/expenses-management/spec.md` | New | Source spec after archive. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scope creep into payroll/reporting/AP | Medium | Keep endpoints limited to operational expense CRUD without delete. |
| Category ambiguity for lunches | Medium | Use `OTHER` + descriptive fields; schema change requires separate approval. |
| Payment semantics misunderstood | Low | Specify paid state as `paidAt != null`; validate `paymentMethod` only with paid expenses. |

## Rollback Plan

Remove `ExpensesModule` import, delete `src/expenses/`, docs, tests, Postman artifacts, and expense seed wiring. No database rollback expected because v1 avoids schema changes.

## Dependencies

- Existing Prisma `Expense` model, `ExpenseCategory`, `PaymentMethod`, and `CostCenter` records.
- Existing auth/authorization and `PrismaModule` infrastructure.

## Success Criteria

- [ ] Authenticated authorized users can create, list, get, and update expenses; no delete route exists.
- [ ] Unknown `costCenterId` is rejected, while omitted `costCenterId` is accepted.
- [ ] Seeds are idempotent and include paid/unpaid expense examples.
