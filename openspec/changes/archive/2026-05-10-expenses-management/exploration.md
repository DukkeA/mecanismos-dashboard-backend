## Exploration: expenses-management

### Current State
- Prisma ALREADY models `Expense` in `prisma/schema.prisma`, so this is not a greenfield persistence slice. The model already has `name`, `category`, `amount`, optional `costCenterId`, required `expectedAt`, optional `paidAt`, optional `paymentMethod`, optional `notes`, and timestamps.
- The baseline SQL migration already creates the `Expense` table plus indexes on `costCenterId`, `expectedAt`, and `paidAt`, and links `Expense.costCenterId -> CostCenter.id` with `ON DELETE SET NULL`.
- Runtime support is MISSING today: there is no `src/expenses/` feature, no `docs/expenses/*`, no expense Postman/e2e artifacts, and no expense seed helper even though `CostCentersModule` and `EmployeesModule` are already wired in `src/app.module.ts`.
- The current backend pattern is stable and should be reused: feature-local module/controller/service/repository folders, explicit `PrismaModule` import, DI token bound with `useExisting: PrismaService`, guarded controllers, DTO validation, pagination envelopes, and reviewer-facing docs/tests (`src/cost-centers/*`, `src/employees/*`).
- `docs/business-context.md` makes the business boundary explicit: expenses are operational overhead (`arriendo`, `servicios públicos`, `almuerzos`, `otros`), MAY reference a cost center, and must stay separate from employee payroll, work-order actual costs, and future reporting flows.
- `openspec/config.yaml` does not exist in the repo, so exploration can rely on the established OpenSpec folder convention and real project code/specs, but there is no extra phase config to inherit.

### Affected Areas
- `prisma/schema.prisma` — source of truth for `Expense`, `ExpenseCategory`, `PaymentMethod`, and the optional `costCenterId` relation.
- `prisma/migrations/20260504065151_add_business_domain/migration.sql` — confirms the table already exists and that deleting a cost center would null historical expense classification.
- `src/app.module.ts` — future import point for a dedicated `ExpensesModule`.
- `src/cost-centers/*` and `openspec/specs/cost-centers-management/spec.md` — reference implementation for consuming cost centers as a separate catalog instead of mutating them inline.
- `src/employees/*` and `openspec/specs/employees-management/spec.md` — strongest reference for a recent reviewer-friendly feature slice with optional cost-center linkage and explicit non-goal boundaries.
- `prisma/seed.ts`, `prisma/seed-cost-centers.ts`, and likely a new `prisma/seed-expenses.ts` — future apply work should add representative, idempotent expense fixtures after cost centers are seeded.
- `docs/business-context.md` — business rules for operational expenses, cost-center usage, and the distinction from work-order actual costs.
- `docs/expenses/*`, `src/expenses/*.artifacts.spec.ts`, `test/expenses/*`, and `test/postman/*expenses*` — likely new reviewer/testing artifacts needed to match current project conventions.

### Approaches
1. **Dedicated `expenses` module on the existing Prisma model** — add a single `src/expenses/` feature that manages operational expense records over the existing `Expense` table, with optional `costCenterId` validation against the separate cost-centers catalog and paid/unpaid state inferred from `paidAt`.
   - Pros: Best fit for the requested boundary; reuses the schema that already exists; keeps expenses separate from employees, payroll, work-order actual costs, and reporting; matches the repo's modular NestJS pattern.
   - Cons: Needs explicit v1 rules for history-preserving updates because the model has no `isActive`; the current enum is narrower than the business examples (`RENT`, `UTILITY`, `OTHER` only), so category semantics must be clarified.
   - Effort: Medium

2. **Expand the expense domain model before exposing runtime APIs** — first change Prisma to add richer expense categories and/or explicit lifecycle fields, then build the NestJS module on top.
   - Pros: Closer to the business wording from `docs/business-context.md`; can reduce future rework if first-class categories like lunches are mandatory now.
   - Cons: More schema churn, more review surface, and a higher chance of dragging this slice into accounting/reporting concerns before the basic feature exists.
   - Effort: Medium/High

### Recommendation
Use **Approach 1**.

Recommended direction for proposal/spec/design:
- Implement a dedicated `ExpensesModule` over the EXISTING `Expense` table.
- Keep the feature boundary STRICT: this module owns operational expenses only; do not mix in employee compensation, payroll projection, work-order actual costs, or reporting endpoints.
- Treat `costCenterId` as an optional reference to the already separate `cost-centers` feature. Expenses may point to a cost center, but this change should not create or edit cost centers inline.
- Model v1 lifecycle around record history, not deletion. Prefer create/list/get/update flows and avoid a delete endpoint so paid and scheduled expense history remains traceable.
- Use `expectedAt` as the planning/scheduled date and `paidAt` plus optional `paymentMethod` as the payment-completion data. Proposal/spec should make that contract explicit so reviewers do not confuse expenses with invoices or payroll.
- Start on the current enum unless stakeholders insist on first-class categories beyond `RENT | UTILITY | OTHER`; if `almuerzos` must be distinct immediately, that should be an explicit scoped schema delta in the proposal rather than accidental scope creep.
- Add idempotent expense seeds and reviewer artifacts so local reviewers can exercise unpaid, paid, with-cost-center, and without-cost-center flows immediately after `prisma db seed`.

### Risks
- Scope creep into work-order actual costs, payroll, or reporting would violate the requested boundary and blur two different cost domains the schema already separates.
- The business examples include `almuerzos`, but the current `ExpenseCategory` enum only exposes `RENT`, `UTILITY`, and `OTHER`; if that mismatch is ignored, API semantics will be ambiguous.
- If delete behavior is exposed casually, the system risks losing operational history that the business context explicitly says to preserve.
- If paid/unpaid behavior is underspecified, the team may accidentally turn this slice into a broader accounts-payable workflow instead of a focused operational-expense catalog.
- If seed/docs/test coverage is skipped, reviewers will have no ready-made expense fixtures even though cost-center and employee review flows already exist.

### Ready for Proposal
Yes — enough is known to propose a focused `expenses` feature on top of the existing Prisma model, with optional cost-center linkage, explicit paid-vs-scheduled semantics, no delete route, and strict separation from payroll, work-order actual costs, and reporting.
