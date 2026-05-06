# Design: Service Catalog Management

## Technical Approach

Implement a dedicated `src/services` NestJS slice over `ServiceCatalog` using the same guarded controller → service → repository pattern already used by `component-types` and `suppliers`. Replace `ServiceCatalog.name @unique` with a derived `slug @unique` so display names stay human-friendly while canonical duplicate prevention happens on normalized data.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|---|---|---|---|
| Canonical uniqueness | Keep `name @unique`; add separate canonical key | Add `slug @unique`, remove `name @unique`, keep `@@index([name])` | `name` is display text; slug matches the confirmed collision policy for accents/case/spacing and aligns with `component-types`. |
| Slug reuse | Copy `normalizeSlug`; import from feature service; extract shared helper | Extract shared helper (for example `src/common/strings/slugify.ts`) and reuse from `component-types` + `services` | Importing from another feature service is bad architecture; shared pure utility avoids duplication without overengineering. |
| Conflict mapping | Let Prisma `P2002` bubble; service-level precheck; repository typed error | Repository maps unique write failures to `ServiceCatalogSlugConflictError`, service translates to `409 Conflict` | Keeps infrastructure concerns in repository and preserves the current project pattern. |
| Role policy | Per-handler overrides; controller-level policy | Controller-level `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('ADMIN', 'SALES')` | Matches existing protected resources and automatically forbids `MECHANIC`. |

## Data Flow

`POST/PATCH /services` → DTO trims input → service normalizes `name`, derives `slug`, normalizes optional `description` → repository persists through Prisma → `P2002` becomes typed slug-conflict error → service returns `409 Conflict`.

`GET /services` → query DTO parses `page/limit/search/isActive` → repository filters by `name OR slug OR description`, ordered by `name asc` → service wraps `{ data, meta }` for combobox-friendly pagination.

## File Changes

| File | Action | Description |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `ServiceCatalog.slug`, remove `name @unique`, add `@@unique([slug])` and `@@index([name])`, `@@index([isActive])`. |
| `prisma/migrations/*/migration.sql` | Create | Reset/dev-oriented structural migration that adds `slug`, drops legacy `name` uniqueness, and avoids SQL slug normalization drift. |
| `prisma/seed.ts` | Modify | Upsert representative service catalog rows by slug. |
| `src/common/strings/slugify.ts` | Create | Shared normalized slug helper reused by `component-types` and `services`. |
| `src/component-types/component-types.service.ts` | Modify | Reuse shared slug helper; behavior unchanged. |
| `src/services/**` | Create | Module, controller, DTOs, service, repository, unit tests, artifacts spec. |
| `src/app.module.ts` / `src/main.ts` | Modify | Register `ServicesModule` and Swagger tag. |
| `docs/services/*.md` | Create | Overview, API map, validation rules, testing guide. |
| `test/postman/mecanismos-dashboard-services.postman_collection.json` | Create | Runner-ready verification for login/create/conflict/list/get/update/forbidden cases. |
| `test/services/services.e2e-spec.ts` | Create | Prisma-light protected-route e2e coverage by overriding `ServicesService`. |

## Interfaces / Contracts

```ts
type CreateServiceDto = {
  name: string;
  description?: string;
  isActive?: boolean;
};

type UpdateServiceDto = Partial<CreateServiceDto>;

type ListServicesQueryDto = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
};
```

Response shape stays consistent with other resources:

```ts
{ data: ServiceCatalogRecord[]; meta: { page: number; limit: number; total: number; totalPages: number } }
```

Slug is persistence-facing in v1 and MAY be returned in payloads for transparency/search parity, but clients create/update by `name`, not by custom slug.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | slug derivation, rename regeneration, optional-string normalization, 404/409 mapping | `src/services/services.service.spec.ts` + shared slug helper spec if added |
| Repository | Prisma write mapping, list filter shape, trimming, slug persistence | `src/services/persistence/services.repository.spec.ts` |
| Controller | Route metadata, guards, roles, AppModule wiring | `src/services/services.controller.spec.ts` |
| Artifacts | Docs + Postman existence/content | `src/services/services.artifacts.spec.ts` |
| E2E | 401 unauthenticated, 403 `MECHANIC`, 200/201 happy paths, 409 duplicate, 404 missing | `test/services/services.e2e-spec.ts` overriding `ServicesService` |

## Migration / Rollout

1. Keep `slugify()` in TypeScript as the ONLY semantic source of truth for canonical service slugs.
2. Make the SQL migration structural for the dev baseline: add `slug`, set `NOT NULL`, drop `ServiceCatalog_name_key`, and add the `slug`, `name`, and `isActive` indexes.
3. If Prisma detects the edited migration was already applied locally, reset/replay the dev database instead of re-encoding slug normalization logic in SQL.
4. Apply module/docs/tests/Postman/seed changes, then run Prisma generate in apply.

Rollback: remove runtime/docs artifacts first, then revert the slug migration before other features depend on `/services` slugs.

## Open Questions

- [x] Resolved: the migration stays reset/dev-oriented and structural; canonical slug semantics remain application-owned in `slugify()` instead of being duplicated in SQL.
