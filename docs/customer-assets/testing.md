# Customer assets testing guide

## Automated tests

Primary verification is automated. Use these commands from repo root:

```bash
npm run test -- src/components/components.service.spec.ts src/components/persistence/components.repository.spec.ts src/customer-assets/customer-assets.artifacts.spec.ts
npm run test:e2e -- test/customer-assets/components.e2e-spec.ts
npm run test:e2e -- test/customer-assets/customers.e2e-spec.ts test/customer-assets/vehicles.e2e-spec.ts test/customer-assets/components.e2e-spec.ts
npm run test
npx tsc --noEmit
```

## What each layer proves

| Layer | Files | Why it matters |
| --- | --- | --- |
| Unit | `src/customers/**/*.spec.ts`, `src/vehicles/**/*.spec.ts`, `src/components/**/*.spec.ts` | Validates normalization, pagination query shapes, duplicate/error mapping, and ownership rules. |
| E2E | `test/customer-assets/*.e2e-spec.ts` | Validates auth cookies, `ADMIN | SALES` access, `MECHANIC` rejection, DTO validation, and HTTP status contracts. |
| Artifact | `src/customer-assets/*.artifacts.spec.ts` | Verifies docs and Postman artifacts ship with the feature. |

## Postman workflow

Use `test/postman/mecanismos-dashboard-customer-assets.postman_collection.json` for manual reviewer checks.

Recommended order:
1. Login with auth v1 collection to obtain cookies.
2. Run customer create/list/get/update requests.
3. Run vehicle create/list/get/update requests.
4. Run component create/list/get/update requests, especially the same-customer vehicle rule.

## Manual focus points

- Confirm `PATCH /components/:id` can clear `vehicleId`.
- Confirm mismatch between component `customerId` and vehicle owner returns `400`.
- Confirm `customerId` reassignment attempts are rejected at validation boundary.
- Confirm there are no delete routes in Swagger or Postman.
