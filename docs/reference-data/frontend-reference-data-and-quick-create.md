# Frontend reference data and quick create

This slice is READY FOR REVIEW as a single `size:exception` work unit. The backend now exposes module-owned `GET /.../options` and `POST /.../quick-create` routes so frontend forms can fetch compact combobox data and create missing records inline without depending on full CRUD payloads.

## Quick path

1. Run `npm run test -- src/common/reference-data/reference-data-controllers.spec.ts src/common/reference-data/reference-data-repositories.spec.ts src/common/reference-data/reference-data-reviewer-artifacts.spec.ts`.
2. Run `npm run test:e2e -- test/reference-data/reference-data.e2e-spec.ts`.
3. Import `test/postman/mecanismos-dashboard-reference-data.postman_collection.json` and run **Setup**, **Options**, **Quick Create**, then **Protection Checks**.

## Review order

| Review first | Why it matters |
| --- | --- |
| `GET /services/options` | Proves the shared `{ data, meta }` option contract, trimmed search, and default `limit=10`. |
| `GET /vehicles/options` | Proves customer-scoped option filtering stays module-owned. |
| `POST /employees/quick-create` | Proves incomplete-profile semantics with `baseSalaryMonthly = 0`. |
| `POST /components/quick-create` | Proves unsafe cross-customer associations still fail. |

## Endpoint matrix

| Capability | Representative routes | Reviewer expectation |
| --- | --- | --- |
| Shared options contract | `GET /services/options`, `GET /vehicles/options`, `GET /cost-centers/options` | Always returns `{ data, meta? }` with compact `id` + `label` rows. |
| Bounded search | `GET /services/options?search=diag&limit=10` | Search is trimmed and `limit` validates `<= 100`. |
| Inline creation | `POST /customers/quick-create`, `POST /inventory-items/quick-create`, `POST /cost-centers/quick-create` | Success returns option-compatible `data` plus optional `entity`/`meta`. |
| Employee incomplete profile | `POST /employees/quick-create` | Missing salary is accepted, persisted as `0`, and documented with `meta.incompleteProfile=true`. |
| Relationship safety | `POST /components/quick-create` | Component creation still rejects a vehicle that belongs to another customer. |

## Postman collection notes

- The collection generates per-run values with `runId`; it does NOT depend on hardcoded seeded IDs.
- It captures `customerId`, `vehicleId`, and `costCenterId` from prior responses before dependent requests run.
- Protection coverage includes duplicate quick-create conflict and forbidden mechanic access.
- Customer, vehicle, and component options default to active-only. Use `?isActive=false` to request inactive options; full list endpoints only filter lifecycle when `isActive=true|false` is provided.

## Out of scope

This section makes the out of scope boundary explicit for reviewers.

- No generic `/reference-data` aggregator.
- No nested magical creates that write customer, vehicle, and component in one request.
- No inventory stock movements during item quick-create.
- No attempt to complete the entire employee payroll profile inline.

## Acceptance checklist

- [ ] `GET /services/options` returns compact rows and `meta.limit`.
- [ ] `GET /vehicles/options` stays customer-scoped.
- [ ] `POST /employees/quick-create` returns incomplete-profile metadata.
- [ ] `POST /customers/quick-create` duplicate data returns `409`.
- [ ] `POST /components/quick-create` cross-customer vehicle reuse returns `400`.
