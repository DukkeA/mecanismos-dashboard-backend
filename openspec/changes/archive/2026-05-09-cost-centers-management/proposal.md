# Proposal: Cost Centers Management

## Intent

Expose the existing `CostCenter` Prisma model as a focused NestJS catalog so admins can manage simple area classifiers (`GENERAL`, `BODEGA`, `OFICINA`) without mixing in employees, expenses, reporting, or work orders.

## Scope

### In Scope
- Dedicated `src/cost-centers/` feature module with guarded CRUD-lite HTTP endpoints.
- Active/inactive lifecycle; no delete endpoint.
- Idempotent default seeds for `GENERAL`, `BODEGA`, and `OFICINA`.
- Tests and reviewer-facing artifacts consistent with existing catalog slices.

### Out of Scope
- Employee assignment, expense flows, reporting, and work orders.
- Prisma schema changes unless later phases prove an unavoidable gap.

## Capabilities

### New Capabilities
- `cost-centers-management`: Protected cost-center catalog API, code normalization, active/inactive lifecycle, seeds, tests, and reviewer artifacts.

### Modified Capabilities
- None.

## Approach

Use the existing `CostCenter` table and add a standalone `CostCentersModule` following `Controller -> Service -> Repository -> Prisma`. Import `PrismaModule` explicitly, bind a repository token to a Prisma-backed adapter, normalize `code` to trimmed uppercase tokens, reject duplicate canonical codes with `409`, and keep `name` as display text. Provide create, list, get, and update/deactivate behavior; deletion stays unavailable to avoid nulling future historical links.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/cost-centers/` | New | Module, controller, service, DTOs, repository, tests. |
| `src/app.module.ts` | Modified | Import `CostCentersModule`. |
| `prisma/seed.ts` | Modified | Upsert default cost centers idempotently. |
| `docs/cost-centers/`, `test/postman/` | New/Modified | Reviewer guidance and executable API artifacts. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Duplicate codes via casing/spacing | Medium | Normalize before persistence and conflict checks. |
| Scope creep into expenses/employees | Medium | Keep specs limited to catalog behavior only. |
| Delete semantics erase classification links | Low | Expose inactive lifecycle, not delete. |

## Rollback Plan

Remove `CostCentersModule` import and `src/cost-centers/`, revert seed additions and docs/Postman artifacts. No schema rollback is expected because the table already exists.

## Dependencies

- Existing `CostCenter` Prisma model and explicit `PrismaModule` pattern.
- Existing auth/roles guards used by protected catalog endpoints.

## Success Criteria

- [ ] Reviewers can seed and find `GENERAL`, `BODEGA`, and `OFICINA`.
- [ ] Authenticated allowed users can create, list, get, update, and deactivate cost centers.
- [ ] Duplicate canonical codes are rejected and no delete endpoint exists.
