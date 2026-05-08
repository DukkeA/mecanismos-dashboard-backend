# Archive Report

**Change**: `nestjs-architecture-hardening`  
**Archived on**: `2026-05-08`  
**Artifact store**: `hybrid`  
**Verify verdict**: `PASS WITH WARNINGS`

## Source Artifact Traceability

| Artifact | Filesystem source | Engram observation IDs |
|---|---|---|
| Exploration | `openspec/changes/archive/2026-05-08-nestjs-architecture-hardening/exploration.md` | N/A |
| Proposal | `openspec/changes/archive/2026-05-08-nestjs-architecture-hardening/proposal.md` | N/A |
| Specification delta (`nestjs-architecture-hardening`) | `openspec/changes/archive/2026-05-08-nestjs-architecture-hardening/specs/nestjs-architecture-hardening/spec.md` | N/A |
| Design | `openspec/changes/archive/2026-05-08-nestjs-architecture-hardening/design.md` | N/A |
| Tasks | `openspec/changes/archive/2026-05-08-nestjs-architecture-hardening/tasks.md` | N/A |
| Verify report | `openspec/changes/archive/2026-05-08-nestjs-architecture-hardening/verify-report.md` | N/A |

## What Shipped

- Added a new source-of-truth OpenSpec at `openspec/specs/nestjs-architecture-hardening/spec.md` with architectural hardening requirements for inventory layout, common boundaries, Prisma module ownership, e2e safety, and testing/documentation taxonomy.
- Archived all runtime-change artifacts under `openspec/changes/archive/2026-05-08-nestjs-architecture-hardening/` to preserve a full audit trail.

## Verification Evidence

| Evidence | Result |
|---|---|
| Tasks completion | `15/15` complete in `openspec/changes/archive/2026-05-08-nestjs-architecture-hardening/tasks.md` |
| Type check | `npx tsc --noEmit -p tsconfig.json` passed |
| Unit tests | `185/185` passed |
| E2E tests | `83/83` passed |
| Lint | `npx eslint "src/**/*.ts" "test/**/*.ts" "prisma/**/*.ts"` passed |
| Coverage | `79.35%` total line coverage (changed-file warnings below) |
| Build | Skipped by instruction |

## Spec Sync Summary

| Domain | Action | Details |
|---|---|---|
| `nestjs-architecture-hardening` | Created | Main spec created from full delta spec in `openspec/specs/nestjs-architecture-hardening/spec.md` (new source-of-truth document, 80 lines). |

## Warnings Carried Forward

- Low coverage warning: `src/main.ts`, `src/prisma/prisma.service.ts`, and `src/prisma.service.ts` remain low/0% coverage in changed-file reporting.
- Investigate why e2e wrapper command (`npm run test:e2e`) reported open-handle warnings while direct `--detectOpenHandles` path did not. This suggests wrapper/environment noise and is a candidate follow-up reliability investigation.

## Changed Areas

- `openspec/specs/nestjs-architecture-hardening/spec.md` (new source-of-truth spec)
- `openspec/changes/archive/2026-05-08-nestjs-architecture-hardening/` (archival of all artifacts)

## Archive Verification

- [x] Main spec created/updated from change delta before archive move
- [x] Change folder moved from `openspec/changes/nestjs-architecture-hardening/` to `openspec/changes/archive/2026-05-08-nestjs-architecture-hardening/`
- [x] Archive contains proposal, exploration, spec, design, tasks, verify-report
- [x] No active folder remains at `openspec/changes/nestjs-architecture-hardening`

## Archive Outcome

`nestjs-architecture-hardening` is fully archived and synchronized into OpenSpec source-of-truth specs with PASS WITH WARNINGS status, preserving required audit evidence and operational caveats.
