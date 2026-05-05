# Archive Report

**Change**: `auth-login-http-only`
**Date**: `2026-05-04`
**Mode**: `hybrid`
**Archive Target**: `openspec/changes/archive/2026-05-04-auth-login-http-only/`
**Skill Resolution**: `injected`

## Summary

Archived the completed auth change after a PASS WITH WARNINGS verification result. Synced the `auth-session` delta spec into the main OpenSpec source of truth, preserved the completed change folder as an immutable audit trail, and refreshed Engram traceability for the final spec/design/tasks/verify state.

## Engram Traceability

| Artifact | Topic Key | Observation ID | Notes |
|---|---|---:|---|
| Exploration | `sdd/auth-login-http-only/explore` | 403 | Baseline investigation retained for audit trail |
| Proposal | `sdd/auth-login-http-only/proposal` | 411 | Scope and approach retained for audit trail |
| Spec | `sdd/auth-login-http-only/spec` | 415 | Final spec state re-synced during archive |
| Design | `sdd/auth-login-http-only/design` | 417 | Final design state re-synced during archive |
| Tasks | `sdd/auth-login-http-only/tasks` | 425 | Final 16/16-complete task state re-synced during archive |
| Apply Progress | `sdd/auth-login-http-only/apply-progress` | 431 | Final implementation/remediation evidence retained for audit trail |
| Verify Report | `sdd/auth-login-http-only/verify-report` | 453 | PASS WITH WARNINGS state re-synced during archive |

## Spec Sync

| Domain | Action | Details |
|---|---|---|
| `auth-session` | Created | No existing main spec was present, so the delta spec was promoted as the new source-of-truth spec at `openspec/specs/auth-session/spec.md` |

## Final Delivery State

| Area | Final State |
|---|---|
| Tasks | 16/16 complete |
| Spec compliance | 12/12 scenarios compliant |
| Type check | `npx tsc --noEmit` passed |
| Unit tests | `npm run test` passed (6 suites, 31 tests) |
| E2E tests | `npm run test:e2e -- auth.e2e-spec.ts` passed (11 tests); `npm run test:e2e -- app.e2e-spec.ts` passed |
| Non-mutating lint | Passed |
| Postman JSON | Parse check passed |
| Build | Intentionally skipped by project rule |

## Preserved Warning

- `npm run test:cov` remains unit-suite-only and does **not** merge e2e coverage, so changed wiring files exercised mainly through e2e (`src/auth/auth-origin.guard.ts`, `src/auth/auth.controller.ts`, `src/auth/auth.module.ts`) still show misleading 0% changed-file coverage in the coverage view.

## Archive Verification

- [x] Main spec updated at `openspec/specs/auth-session/spec.md`
- [x] Change folder prepared with archive report before archival move
- [x] Archive target includes proposal, exploration, specs, design, tasks, verify report, and archive report
- [x] Engram contains traceable artifact records for explore, proposal, spec, design, tasks, apply-progress, and verify-report
- [x] Change is ready to move out of the active `openspec/changes/` directory

## Source of Truth Updated

- `openspec/specs/auth-session/spec.md`

## SDD Cycle Status

This change is fully explored, proposed, specified, designed, implemented, verified, and archived. The only remaining risk is coverage-fidelity reporting, not behavioral correctness.
