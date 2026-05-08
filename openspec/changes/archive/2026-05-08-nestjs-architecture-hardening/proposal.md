# Proposal: NestJS Architecture Hardening

## Intent

Harden the current NestJS modular monolith for learning-quality organization without changing business behavior. The problem is structure drift: empty inventory folders, scattered cross-cutting transforms, e2e bootstrap drift, and repeated Prisma DI wiring.

## Scope

### In Scope
- Remove empty `src/inventory/inventory-items/`, `inventory-movements/`, and nested `inventory/`; keep inventory flat until real submodules are justified.
- Move reusable transforms/parsers to `src/common/` and stop cross-feature DTO helper imports.
- Add shared e2e/app bootstrap helpers that mirror production cookie parser and global `ValidationPipe` while preserving mock seams.
- Centralize Prisma provisioning through a module/provider pattern instead of feature-local `PrismaService` declarations.
- Document module layout, DTO/common helper, Prisma DI, and test-bootstrap conventions.
- Optionally add a small pagination helper convention if it is behavior-neutral.

### Out of Scope / Non-goals
- No route redesign, Prisma schema changes, broad response DTO rewrite, full hexagonal rewrite, or business rule changes.

## Current Architecture Assessment

The code already has useful feature modules, thin controllers, validated DTOs, Swagger coverage, repository-like Prisma access, and reviewer artifacts. This pass should clean the architecture scaffolding, not replace the house while people live in it.

## Capabilities

### New Capabilities
None — this is implementation architecture hardening.

### Modified Capabilities
None — existing specs such as `inventory-procurement-foundation`, `supplier-management`, and `customer-assets-management` keep their behavior contracts.

## Approach / Work Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/inventory/` | Removed/Documented | Delete empty folders; document flat feature layout. |
| `src/common/` | Modified | Consolidate reusable transforms/parsers. |
| `test/**`, app setup | Modified | Share production-equivalent `ValidationPipe` setup. |
| `src/prisma*`, modules | Modified | Harden Prisma DI/module ownership. |
| `docs/**` | Modified | Add concise architecture conventions. |
| pagination helpers | Optional | Add only if low-risk and behavior-neutral. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Test helper breaks mocks | Med | Keep override-friendly bootstrap seams. |
| Prisma DI import churn | Med | Slice by module and verify tests. |
| Scope expands into rewrite | Med | Enforce non-goals and behavior-neutral diffs. |

## Slice Plan

1. Inventory layout + docs convention.
2. Common transforms/parsers consolidation.
3. Shared e2e bootstrap parity.
4. Prisma DI/module hardening.
5. Optional pagination helper if still small.

## Rollback Plan

Revert by slice: restore deleted folders only if needed, move helpers back to prior feature files, and re-add local Prisma providers/test bootstrap code.

## Dependencies

- No new runtime dependencies expected.

## Success Criteria

- [ ] No empty inventory drift folders remain.
- [ ] Cross-cutting helpers live under `common/`.
- [ ] E2e setup uses production-equivalent validation.
- [ ] Feature modules stop owning duplicate Prisma providers.
- [ ] Architecture conventions are documented and reviewer-friendly.
