# Services testing guide

## Commands

- Unit/spec focus: `npm run test -- src/common/strings/slugify.spec.ts src/services/services.schema.spec.ts src/services/services.service.spec.ts src/services/dto/list-services-query.dto.spec.ts src/services/persistence/services.repository.spec.ts src/services/services.controller.spec.ts src/services/services.artifacts.spec.ts src/swagger/swagger.config.spec.ts`
- E2E focus: `npm run test:e2e -- test/services/services.e2e-spec.ts`
- Typecheck: `npx tsc --noEmit`

## Reviewer flow

1. Run `npx prisma migrate dev` on the dev database. If Prisma requests a reset because this edited migration was already applied locally, accept the reset for the development-only baseline and reseed afterwards.
2. Run the Postman collection in `test/postman/mecanismos-dashboard-services.postman_collection.json`.
3. Confirm create/list/get/update, duplicate canonical conflict, forbidden `MECHANIC`, empty-slug `400`, and validation failures.

## Migration note

`ServiceCatalog.slug` uniqueness is enforced by the database, but canonical slug semantics belong to the application `slugify()` helper. This migration is intentionally reset/dev-oriented: it adds the structural column + indexes and expects a fresh dev baseline instead of duplicating slug normalization rules in SQL.

## Rollback order

1. Remove runtime/docs/Postman artifacts that depend on `/services`.
2. Revert the service module wiring and shared slug helper reuse.
3. Revert the `ServiceCatalog.slug` migration before downstream features depend on canonical slugs.

## Why rollback order matters

The migration changes persistence contracts. If you roll back schema first while code still expects `slug`, runtime and seed flows break.
