# Tasks: NestJS Architecture Hardening

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650-950 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 inventory+common, PR2 Prisma wiring, PR3 bootstrap+e2e+docs |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Clean layout and shared helpers | PR 1 | Safe base; includes inventory cleanup and common transforms/pagination helpers. |
| 2 | Centralize Prisma ownership | PR 2 | Depends on PR 1 only for imports touched nearby. |
| 3 | Align bootstrap, DB e2e, and docs | PR 3 | Depends on PR 2; highest test/docs churn. |

## Phase 1: Foundation

- [x] 1.1 Remove empty drift folders under `src/inventory/`; keep active inventory code flat and document any folder kept with evidence.
- [x] 1.2 RED: inventory/layout doc check or repo assertion proving placeholder inventory folders are absent after cleanup.
- [x] 1.3 Create `src/common/` transforms/pagination helpers only for multi-feature reuse; keep single-feature helpers local and list moved files.
- [x] 1.4 GREEN/REFACTOR: update feature imports away from cross-feature private helpers; delete duplicates after parity review.

## Phase 2: Prisma DI Hardening

- [x] 2.1 Create `src/prisma/prisma.module.ts` as the sole non-global owner/exporter of `PrismaService`; keep compatibility path only if required for low-risk migration.
- [x] 2.2 Update each Prisma-consuming `src/**/*.module.ts` to import `PrismaModule`, preserve repository tokens, and remove duplicate `PrismaService` ownership.
- [x] 2.3 RED/GREEN: add or update module/service specs covering explicit imports and provider resolution without global Prisma assumptions.

## Phase 3: App + E2E Bootstrap

- [x] 3.1 Create shared bootstrap in `src/app.bootstrap.ts`; move production `ValidationPipe`, cookie parser, CORS, and optional Swagger wiring behind one function used by `src/main.ts`.
- [x] 3.2 Create `test/support/create-e2e-app.ts` and `test/support/db-e2e.ts` to mirror production bootstrap and require `DATABASE_URL_TEST` with explicit unsafe-target failure.
- [x] 3.3 GREEN: wire `npm run test:e2e` preparation to migrate/seed ONLY the test DB, using scripts only if schema stays unchanged.
- [x] 3.4 REFACTOR: update DB-backed e2e specs to use the shared helpers, deterministic seed/read strategy, and cleanup boundaries.

## Phase 4: Docs, Verification, Rollback

- [x] 4.1 Create/update `docs/architecture.md` with module boundary, common boundary, PrismaModule ownership, test taxonomy, and rollback notes per work unit.
- [x] 4.2 Add concise `aprendizaje/*.md` guides for modules, providers/DI, controllers-services-repositories, PrismaModule, and unit vs e2e testing.
- [x] 4.3 Verify with `npm run format`, `npm run lint`, `npm run test`, `npm run test:e2e`; do not run build.
- [x] 4.4 Define rollback boundaries: Unit 1 revert folder/helper moves, Unit 2 revert PrismaModule imports/providers, Unit 3 revert bootstrap/e2e/docs changes.
