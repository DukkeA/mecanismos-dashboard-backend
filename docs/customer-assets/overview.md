# Customer assets overview

## Answer first

This slice delivers protected CRUD-lite for **component types, customers, vehicles, and components**. Every route requires auth v1 cookies, allows **ADMIN | SALES**, excludes `MECHANIC`, and deliberately omits delete/reassignment flows.

## What reviewers should verify

1. Customers can be created, listed, fetched, and updated with optional `notes`.
2. Vehicles always belong to an existing customer and cannot change `customerId` later.
3. Component types can be created ahead of time for combobox-style frontend flows and reuse a normalized unique slug.
4. Components always belong to an existing customer; any `vehicleId` link must stay inside the **same customer** boundary and every component must reference a valid `componentTypeId`.

## Route families

| Resource | Routes | Notes |
| --- | --- | --- |
| Component types | `POST /component-types`, `GET /component-types`, `GET /component-types/:id`, `PATCH /component-types/:id` | Catalog for normalized component categories and combobox creation. |
| Customers | `POST /customers`, `GET /customers`, `GET /customers/:id`, `PATCH /customers/:id` | `notes` is optional nullable LexKit/Lexical editor-state JSON stored opaquely. |
| Vehicles | `POST /vehicles`, `GET /vehicles`, `GET /vehicles/:id`, `PATCH /vehicles/:id` | `customerId` set once on create. |
| Components | `POST /components`, `GET /components`, `GET /components/:id`, `PATCH /components/:id` | `vehicleId` is optional but relation-safe; `componentTypeId` is required. |

## Explicit non-goals

- No `DELETE` endpoints.
- No customer reassignment for vehicles or components.
- No MECHANIC write/read access in this feature.
- No metrics or profitability scope widening for SALES.

## Reviewer shortcut

- API details: `docs/customer-assets/api-map.md`
- Validation/ownership rules: `docs/customer-assets/validation-rules.md`
- Test + Postman guide: `docs/customer-assets/testing.md`
