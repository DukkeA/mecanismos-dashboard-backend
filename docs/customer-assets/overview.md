# Customer assets overview

## Answer first

This slice delivers protected CRUD-lite for **customers, vehicles, and components**. Every route requires auth v1 cookies, allows **ADMIN | SALES**, excludes `MECHANIC`, and deliberately omits delete/reassignment flows.

## What reviewers should verify

1. Customers can be created, listed, fetched, and updated with optional `notes`.
2. Vehicles always belong to an existing customer and cannot change `customerId` later.
3. Components always belong to an existing customer; any `vehicleId` link must stay inside the **same customer** boundary.

## Route families

| Resource | Routes | Notes |
| --- | --- | --- |
| Customers | `POST /customers`, `GET /customers`, `GET /customers/:id`, `PATCH /customers/:id` | `notes` is optional rich-text string stored opaquely. |
| Vehicles | `POST /vehicles`, `GET /vehicles`, `GET /vehicles/:id`, `PATCH /vehicles/:id` | `customerId` set once on create. |
| Components | `POST /components`, `GET /components`, `GET /components/:id`, `PATCH /components/:id` | `vehicleId` is optional but relation-safe. |

## Explicit non-goals

- No `DELETE` endpoints.
- No customer reassignment for vehicles or components.
- No MECHANIC write/read access in this feature.
- No metrics or profitability scope widening for SALES.

## Reviewer shortcut

- API details: `docs/customer-assets/api-map.md`
- Validation/ownership rules: `docs/customer-assets/validation-rules.md`
- Test + Postman guide: `docs/customer-assets/testing.md`
