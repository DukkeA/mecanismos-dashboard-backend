# Archive Report

**Change**: `cost-centers-management`  
**Archived on**: `2026-05-09`  
**Artifact store**: `hybrid`  
**Verify verdict**: `PASS WITH WARNINGS`

## Source Artifact Traceability

| Artifact | Filesystem source | Engram observation ID |
|---|---|---|
| Exploration | `openspec/changes/archive/2026-05-09-cost-centers-management/exploration.md` | N/A |
| Proposal | `openspec/changes/archive/2026-05-09-cost-centers-management/proposal.md` | #825 |
| Specification delta (`cost-centers-management`) | `openspec/changes/archive/2026-05-09-cost-centers-management/specs/cost-centers-management/spec.md` | #829 |
| Design | `openspec/changes/archive/2026-05-09-cost-centers-management/design.md` | #827 |
| Tasks | `openspec/changes/archive/2026-05-09-cost-centers-management/tasks.md` | #831 |
| Verify report | `openspec/changes/archive/2026-05-09-cost-centers-management/verify-report.md` | #839 |

## What Shipped

- Added `openspec/specs/cost-centers-management/spec.md` as a new source-of-truth spec from the delta at `openspec/changes/archive/2026-05-09-cost-centers-management/specs/cost-centers-management/spec.md`.
- Archived all change artifacts under `openspec/changes/archive/2026-05-09-cost-centers-management/` for full audit trail.

## Verification Evidence

| Evidence | Result |
|---|---|
| Tasks completion | `15/15` complete in `openspec/changes/archive/2026-05-09-cost-centers-management/tasks.md` |
| Unit test run | `npm run test` → `52 passed, 52 total` |
| Cost-centers test run | `npm run test -- src/cost-centers` → `7 passed, 7 total` |
| E2E test run | `npm run test:e2e -- test/cost-centers/cost-centers.e2e-spec.ts` → `1 passed, 1 total` |
| Type check | `npx tsc --noEmit -p tsconfig.json` passed |
| Lint | `npx eslint "src/app.module.ts" "src/cost-centers/**/*.ts" "prisma/seed.ts" "prisma/seed-cost-centers.ts" "test/cost-centers/**/*.ts"` passed |
| Coverage | Changed-source files reported `95.13%` average line coverage, all above threshold |
| Build | Skipped by project standard |

## Spec Sync Summary

| Domain | Action | Details |
|---|---|---|
| `cost-centers-management` | Created | Main-spec file created in `openspec/specs/cost-centers-management/spec.md` (58 lines). |

## Warnings Carried Forward

- Jest open-handle warning persists on e2e completion (`npm run test:e2e -- test/cost-centers/cost-centers.e2e-spec.ts`), non-blocking and pre-existing.

## Archive Verification

- [x] Main spec created before archive move
- [x] Change folder moved from `openspec/changes/cost-centers-management/` to `openspec/changes/archive/2026-05-09-cost-centers-management/`
- [x] Archive contains proposal, exploration, specification, design, tasks, and verify artifacts
- [x] No active folder remains at `openspec/changes/cost-centers-management/`

## Archive Outcome

`cost-centers-management` is fully archived with PASS WITH WARNINGS and now represented in source-of-truth OpenSpec at `openspec/specs/cost-centers-management/spec.md`.
