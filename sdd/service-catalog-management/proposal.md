# Proposal: Service Catalog Management

## Intent

Deliver the first protected `/services` catalog so `ADMIN | SALES` can create, list, get, and update reusable business services while blocking near-duplicate names through canonical uniqueness instead of raw display-name matching.

## Scope

### In Scope
- Add a dedicated `/services` Nest resource backed by `ServiceCatalog` with create/list/get/update endpoints.
- Keep `name` required, `description` optional, `isActive` supported, and preserve `ServiceCatalog` IDs/relations.
- Add canonical slug-based uniqueness so accent/case/whitespace variants collide with `409 Conflict`.
- Support combobox-friendly flow: search/list for reuse and create-by-name when the option does not exist.
- Deliver idempotent seeds, reviewer docs, Postman runner coverage, and automated tests.

### Out of Scope
- Work-order estimate integration changes beyond keeping existing foreign keys safe.
- Delete/archive flows, bulk import, or synonym/merge tooling.
- Advanced ranking/full-text search beyond pragmatic combobox lookup.

## Result Contract

### New Capabilities
- `service-catalog-management`: Protected service-catalog CRUD-lite with canonical duplicate prevention, combobox-friendly lookup/create behavior, docs, Postman, and tests.

### Modified Capabilities
- None.

## Approach

Follow the existing resource pattern from `component-types` and `suppliers`: guarded controller, validated DTOs, service business rules, and Prisma-backed repository. Keep `ServiceCatalog.name` as display text, add a deterministic normalized `slug @unique`, derive it on create/rename, and translate canonical collisions into typed `409` responses. Initial list should stay pragmatic with pagination plus optional search/active filtering for frontend combobox reuse.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add canonical `slug` and supporting indexes to `ServiceCatalog` |
| `prisma/migrations/*` | New | Reset/dev-oriented structural migration for the service catalog baseline |
| `prisma/seed.ts` | Modified | Idempotent representative services |
| `src/app.module.ts` | Modified | Register `ServicesModule` |
| `src/services/**` | New | Controller, service, repository, DTOs, tests |
| `docs/services/**` | New | Reviewer-facing docs |
| `test/postman/mecanismos-dashboard-services.postman_collection.json` | New | Runner-ready manual verification |
| `test/services/*.e2e-spec.ts` | New | Protected-route e2e coverage |

## Migration Strategy

Add `slug` as the new unique field, keep canonical slug semantics in the application `slugify()` helper, and let the database enforce only `slug @unique`. Because the current database is development-only with no real data, the migration can stay structural and rely on reset/replay instead of SQL backfill logic.

## Verification Strategy

Unit tests for slug normalization/conflict handling and service rules, controller/auth coverage for `ADMIN | SALES` allowed and `MECHANIC` forbidden, artifact tests for docs/Postman, Prisma-light e2e coverage, and seed checks proving representative services stay idempotent.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Edited migration was already applied locally | Med | Reset/replay the dev database instead of carrying a second SQL slug-normalization implementation |
| Rename semantics drift between display name and slug | Med | Make slug regeneration explicit in spec/design and test update collisions |
| `/services` route becomes semantically broad | Low | Document that it represents reusable business service catalog entries only |

## Rollback Plan

Revert the `services` module/docs/tests/Postman artifacts and roll back the slug migration before downstream work-order flows start depending on canonical service reuse.

## Dependencies

- Existing auth-session guards/roles
- Prisma migrate/generate in apply after schema change
- Root `.env` local runtime and seed workflow

## Success Criteria

- [ ] Specs/design define protected create/list/get/update `/services` behavior backed by `ServiceCatalog`.
- [ ] Duplicate prevention is based on canonical slug uniqueness, not raw `name @unique` alone.
- [ ] Reviewers receive seeds, docs, Postman, and automated verification requirements for the service catalog slice.
