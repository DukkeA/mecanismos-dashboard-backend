# Customer assets testing guide

## Automated tests

Primary verification is automated. Use these commands from repo root:

```bash
npm run test -- customers vehicles components common/reference-data
npm run test:e2e -- test/customer-assets/component-types.e2e-spec.ts test/customer-assets/components.e2e-spec.ts
npm run test:e2e -- test/customer-assets/customers.e2e-spec.ts test/customer-assets/vehicles.e2e-spec.ts test/customer-assets/components.e2e-spec.ts
npm run test
npx tsc --noEmit
```

## What each layer proves

| Layer    | Files                                                                                    | Why it matters                                                                                                    |
| -------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Unit     | `src/component-types/**/*.spec.ts`, `src/customers/**/*.spec.ts`, `src/vehicles/**/*.spec.ts`, `src/components/**/*.spec.ts` | Validates normalization, pagination query shapes, duplicate/error mapping, slug rules, and ownership rules.       |
| E2E      | `test/customer-assets/*.e2e-spec.ts`                                                     | Validates auth cookies, `ADMIN \| SALES` access, `MECHANIC` rejection, DTO validation, and HTTP status contracts. |
| Artifact | `src/customer-assets/*.artifacts.spec.ts`                                                | Verifies docs and Postman artifacts ship with the feature.                                                        |

## Postman workflow

Use `test/postman/mecanismos-dashboard-customer-assets.postman_collection.json` for runner-friendly reviewer checks.

Before manual checks, apply migrations and seed representative data:

```bash
npx prisma migrate dev
npx prisma db seed
```

Use `npx prisma migrate deploy` instead when applying already committed migrations in CI/staging/production-style environments where no new migration should be created.

The seed creates sample `ADMIN`, `SALES`, and `MECHANIC` users plus customer-assets data for component types, customers, vehicles, and components. It includes active and inactive customers, vehicles, and components so `?isActive=false` and options overrides can be exercised immediately.

### Collection Runner order

1. Import the collection.
2. Confirm `baseUrl` matches the local Nest app.
3. Run the **Runner Happy Path** folder.
4. Run the **Protection Checks** folder.

### What the collection automates

- Logs in as the seeded `ADMIN` user before customer-assets requests.
- Generates unique customer/vehicle/component payload values per run so reruns do not collide on document number, plate, or identifier.
- Captures `componentTypeId`, `customerId`, `vehicleId`, and `componentId` from create responses and reuses them in later GET/PATCH requests.
- Exercises `isActive=false` create/update, list filtering, and options override flows for customers, vehicles, and components.
- Verifies `401` after logout and `403` for a seeded `MECHANIC` user on a protected customer-assets endpoint.

You no longer need placeholder IDs like `customer-1`, `vehicle-1`, or `component-1` for the default runner flow.

## Manual focus points

- Confirm `PATCH /components/:id` can clear `vehicleId`.
- Confirm `GET /components` can filter by `componentTypeId`.
- Confirm mismatch between component `customerId` and vehicle owner returns `400`.
- Confirm duplicate component-type creation normalizes to the same slug and returns `409`.
- Confirm `customerId` reassignment attempts are rejected at validation boundary.
- Confirm list endpoints include both active and inactive rows by default while options default to active-only.
- Confirm there are no delete routes in Swagger or Postman.
