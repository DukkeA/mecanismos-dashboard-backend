# Design: NestJS Architecture Hardening

## Technical Approach

Harden the existing NestJS modular monolith without changing API behavior. Keep feature code in feature modules, use `Controller -> Service -> Repository`, centralize only utilities reused by multiple modules/features, and make `npm run test:e2e` run realistic DB-backed HTTP tests against `DATABASE_URL_TEST`.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Modular shape | Pragmatic modular monolith with thin controllers, injectable services, and feature repositories | Full hexagonal rewrite | The code already has feature modules and repositories; a rewrite would add churn without solving current drift. |
| Common boundary | Move helpers to `src/common` only when reused across modules/features | Put all helpers in common now | Prevents `common/` becoming a junk drawer; module-internal reuse remains module-local. |
| Inventory layout | Keep `src/inventory` flat; delete empty `inventory-items/`, `inventory-movements/`, `inventory/` folders | Create nested inventory subfeatures now | Current active files are flat and the folders are empty drift. Nested submodules can be introduced when behavior justifies them. |
| Prisma DI | Add explicit non-global `src/prisma/prisma.module.ts`; import it from modules that need Prisma and keep repository tokens using `useExisting: PrismaService` | Global module or repeated providers | Non-global imports teach DI boundaries and avoid hidden dependencies while removing duplicate provider ownership. |
| E2E phase | `npm run test:e2e` is the single e2e phase, DB-backed via `DATABASE_URL_TEST` only | Split mocked/DB e2e phases or fallback to `DATABASE_URL` | User-facing taxonomy stays Unit / E2E / Postman; no accidental production/dev DB usage. |
| Learning docs | Add `aprendizaje/` docs with examples and frontend analogies | Only terse architecture reference | This change is for learning-quality architecture, so concepts must be explained, not just applied. |

## Data Flow

```text
HTTP -> Controller DTO validation -> Service business rule -> Repository Prisma query
      -> response object ({ data, meta } for lists where already used)

test:e2e -> require DATABASE_URL_TEST -> migrate/seed test DB -> HTTP app -> real Prisma
main.ts/test bootstrap -> configureApp(app) -> cookieParser + ValidationPipe + CORS
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/app.bootstrap.ts` | Create | Shared `configureApp(app, options?)` for cookie parser, global `ValidationPipe`, CORS, and optional Swagger. |
| `src/main.ts` | Modify | Create app, call shared bootstrap, then listen. |
| `test/support/create-e2e-app.ts` | Create | Test helper that compiles `AppModule` and applies production-equivalent bootstrap without service mocks for normal e2e. |
| `test/support/db-e2e.ts` | Create | Requires `DATABASE_URL_TEST`, rejects fallback to `DATABASE_URL`, runs/validates seed, provides deterministic IDs/prefix cleanup. |
| `src/prisma/prisma.module.ts` | Create | Explicit non-global module that owns and exports `PrismaService`. |
| `src/prisma.service.ts` | Move/Keep compat | Prefer `src/prisma/prisma.service.ts`; keep a temporary re-export if needed for low-risk test migration. |
| `src/*/*.module.ts` | Modify | Import `PrismaModule`; remove local `PrismaService` providers; retain feature repository tokens. Export only providers required by another module. |
| `src/common/transforms/string.transforms.ts` | Create | Shared `TrimmedString`, `OptionalTrimmedString`, `LowercaseEmail`; delete duplicated feature copies after import migration. |
| `src/inventory/inventory-items/`, `inventory-movements/`, `inventory/` | Delete | Empty drift folders. |
| `docs/architecture.md` | Create | Reviewer-friendly conventions for modules, common boundary, Prisma DI, e2e categories, pagination contracts. |
| `aprendizaje/*.md` | Create | Teaching docs for NestJS modules/providers/DI/controllers/services/repositories/PrismaModule/testing with examples and frontend analogies. |

## Interfaces / Contracts

- Request DTOs remain module-owned and validated with global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`.
- List endpoints keep the existing `{ data, meta: { page, limit, total, totalPages } }` shape; introduce only a small local/shared type/helper if behavior-neutral.
- Repositories expose domain-language methods; services must not depend on raw Prisma calls directly.
- `PrismaModule` is the only owner of `PrismaService`; it is explicit/non-global. Feature modules own their repository injection tokens.
- E2E MUST fail fast when `DATABASE_URL_TEST` is missing and MUST NOT read `DATABASE_URL` as fallback.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Services, repositories, DTO transforms, bootstrap helper | Jest with focused mocks; no DB. |
| E2E | Real HTTP + real modules + real Prisma against test DB | `npm run test:e2e` requires `DATABASE_URL_TEST`, prepares schema/seed, uses stable seed IDs for reads and test-specific IDs for writes, cleanup by prefix in `afterEach`. |
| Postman | Manual exploratory/regression discovery | Findings become automated e2e regression tests; Postman is not a separate automated phase. |

Avoid flakiness by never mutating shared seed rows, using deterministic timestamps where possible, and running e2e serially if the shared test database collides. Keep controller-contract mocks in unit/controller specs, not as the main e2e strategy.

## Migration / Rollout

No data migration required. Roll out in reviewable slices: (1) inventory/docs, (2) transforms, (3) explicit PrismaModule wiring, (4) bootstrap + `DATABASE_URL_TEST` e2e helpers, (5) `aprendizaje/` learning docs and optional pagination convention. Each slice can be reverted independently.

## Verification Plan

- Focused: run affected `*.spec.ts` / `*.e2e-spec.ts` for each slice.
- Full: `npm run test`, `npm run test:e2e` with `DATABASE_URL_TEST` set and seeded.
- Formatting/static checks: `npm run format`, `npm run lint` (mutates with `--fix`).
- Do not run build.

## Open Questions

- None blocking.
