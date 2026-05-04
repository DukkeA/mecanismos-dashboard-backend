# AGENTS.md

## Scope
- Single-package NestJS backend. No monorepo packages here; work from repo root.
- Current runtime is still mostly scaffold code in `src/`; the real business shape is in `prisma/schema.prisma`, `prisma/migrations/`, and `docs/business-context.md`.

## Source of truth
- Trust `package.json` scripts and config files over `README.md`; the README is mostly the default Nest starter text plus a small local env note.
- Runtime entrypoint: `src/main.ts` bootstraps `AppModule` and listens on `process.env.PORT ?? 3000`.
- DB wiring lives in `src/prisma.service.ts` and imports the generated client from `generated/prisma/client`.

## Commands that matter
- Install deps: `npm install`
- Dev server: `npm run start:dev`
- Lint: `npm run lint` — IMPORTANT: this runs ESLint with `--fix`, so it mutates files.
- Unit tests: `npm run test`
- E2E tests: `npm run test:e2e`
- Coverage: `npm run test:cov`
- Format: `npm run format` — only formats `src/**/*.ts` and `test/**/*.ts`.

## Prisma / env gotchas
- Prisma schema generates the client into `generated/prisma/`; do not hand-edit generated files.
- `generated/prisma/` is gitignored, but the app imports from it. If schema changes, regenerate the client before relying on new Prisma types.
- Prisma CLI loads `.env` through `prisma.config.ts`; Nest runtime loads `.env` through global `ConfigModule.forRoot({ isGlobal: true })` in `src/app.module.ts`.
- `PrismaService` still reads `process.env.DATABASE_URL` directly, so keep `DATABASE_URL` in the root `.env` for local runtime and e2e paths.

## Testing implications
- `src/app.controller.spec.ts` is isolated and does not touch Prisma.
- `test/app.e2e-spec.ts` is a Prisma-free smoke test and explicitly mocks `src/prisma.service.ts`; keep it that way unless the test truly needs the database.
- Auth or Prisma-backed e2e coverage should use its own harness/specs instead of depending on the smoke test, because the generated Prisma client currently brings ESM-only `import.meta` into Jest.
- Jest globals are enabled through `compilerOptions.types: ["node", "jest"]` in `tsconfig.json`; keep that if test files show `describe`/`it`/`expect` type errors.

## Code map
- `src/app.module.ts` currently wires only `AppController`, `AppService`, and `PrismaService`.
- `prisma/migrations/20260504065151_add_business_domain/migration.sql` is the concrete DB baseline for the business domain; check it before making model-level assumptions.
- `docs/business-context.md` explains domain intent in Spanish; use it to interpret why the Prisma models exist, not as executable truth.

## Rules
- Use nest/cli commands to generate new modules, controllers, and services to maintain consistency.
- Follow NestJS best practices for dependency injection and module organization.
- When modifying the Prisma schema, always run `npx prisma generate` to update the client.
- Write unit tests for new services and controllers, and consider e2e tests for critical flows.
- Keep the README updated with any new scripts or important notes about running the app.
