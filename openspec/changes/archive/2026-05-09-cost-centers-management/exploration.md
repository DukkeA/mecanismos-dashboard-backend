## Exploration: cost-centers-management

### Current State
- Prisma ALREADY models `CostCenter` in `prisma/schema.prisma` with `id`, unique `code`, `name`, `isActive`, timestamps, and downstream relations from both `Employee.costCenterId` and `Expense.costCenterId`.
- The baseline SQL migration already creates the `CostCenter` table and foreign keys from `Employee` and `Expense` with `ON DELETE SET NULL`, so cost centers are not a greenfield domain model anymore; the missing piece is the NestJS feature slice under `src/`.
- There is currently NO `src/cost-centers/` module, controller, service, repository, docs, or reviewer artifacts. A repo-wide search only finds cost center usage in Prisma/domain docs, not runtime code.
- Existing resource modules (`services`, `component-types`, `suppliers`) follow a stable pattern worth copying: `PrismaModule` import, explicit DI token bound to `PrismaService`, controller guards with `JwtAuthGuard + RolesGuard`, service-level business rules, thin repository adapters, paginated list responses, and reviewer-facing docs/Postman artifact checks.
- `docs/business-context.md` defines cost centers as simple classifiers for v1 (`GENERAL`, `BODEGA`, `OFICINA`) used to classify expenses and eventually support area-level reporting. `prisma/seed.ts` currently ships NO seed cost centers, so local reviewers cannot exercise this domain after seeding yet.

### Affected Areas
- `prisma/schema.prisma` — source of truth already contains `CostCenter`, plus optional relations from `Employee` and `Expense`; future apply work should treat this as an existing model, not invent a new one.
- `prisma/migrations/20260504065151_add_business_domain/migration.sql` — confirms `CostCenter` already exists in the baseline and that deleting a center would null historical links on employees/expenses.
- `prisma/seed.ts` — future apply work should add idempotent seed cost centers (`GENERAL`, `BODEGA`, `OFICINA`) so reviewers can use the feature immediately.
- `src/app.module.ts` — future import point for a dedicated `CostCentersModule`.
- `src/services/*` and `src/component-types/*` — strongest references for controller/service/repository/module structure, pagination, canonical uniqueness handling, and docs/testing conventions.
- `docs/business-context.md` — business intent says cost centers are a separate classifier feature and should stay decoupled from employee/expense implementation scope.
- `docs/cost-centers/*`, `test/postman/*`, `src/cost-centers/*.artifacts.spec.ts` — likely reviewer-facing artifact pattern to mirror in later phases.

### Approaches
1. **Standalone managed catalog on the existing table** — add a dedicated `cost-centers` NestJS module backed by the existing `CostCenter` Prisma model, with create/list/get/update flows and deactivate-instead-of-delete semantics.
   - Pros: Matches the user's request for a separate feature/module; uses the schema that already exists; unblocks later employee/expense features cleanly; keeps `code` as the stable canonical classifier key; avoids risky schema churn.
   - Cons: Needs explicit rules to keep codes normalized and prevent admin-created taxonomy drift; slightly more work than a read-only seed list.
   - Effort: Medium

2. **Seeded fixed catalog with read-mostly API** — treat cost centers as a nearly static classifier set (`GENERAL`, `BODEGA`, `OFICINA`) exposed mainly for listing/lookup, with little or no create capability.
   - Pros: Very simple; strongly protects taxonomy consistency; aligns with the “simple classifiers” wording from the business doc.
   - Cons: Weaker fit for “management” as a named feature; pushes future flexibility into another change if the business needs a new center; can feel artificial because the schema already models cost centers as first-class records.
   - Effort: Low

### Recommendation
Use **Approach 1**.

Recommended direction for proposal/spec/design:
- Implement a dedicated `src/cost-centers/` feature that stays STRICTLY separate from employees and expenses for now.
- Reuse the existing CRUD architecture pattern: `Controller -> Service -> Repository -> Prisma`, `PrismaModule` import, explicit repository token, guarded controller, paginated list endpoint, and reviewer artifacts.
- Treat `code` as the canonical unique business key. For v1, normalize it to uppercase trimmed tokens such as `GENERAL`, `BODEGA`, and `OFICINA`; keep `name` as the display label.
- Seed the initial three cost centers so the module is useful immediately after `prisma db seed`.
- Do NOT add delete behavior in v1. The database currently nulls downstream references on delete, which would weaken future historical reporting. Prefer active/inactive lifecycle instead.
- Keep employee/expense assignment workflows explicitly OUT of scope; this feature should only provide the catalog those future modules will consume.

### Risks
- If the feature allows deletion, the current foreign keys will set `Employee.costCenterId` and `Expense.costCenterId` to `NULL`, erasing historical classification for later reporting.
- If `code` normalization is underspecified, reviewers may see near-duplicates like `general`, `GENERAL`, or padded variants despite the domain wanting simple stable classifiers.
- If the proposal tries to include employee or expense CRUD now, the change will lose focus and violate the requested feature boundary.
- Because `prisma/seed.ts` currently has no cost center fixtures, skipping seed work would make the feature look incomplete in local review even if the API exists.

### Ready for Proposal
Yes — enough is known to propose a focused `cost-centers` catalog feature on top of the EXISTING Prisma model, with seeded initial classifiers, no delete endpoint, and no employee/expense scope creep.
