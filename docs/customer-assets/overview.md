# Customer assets overview

## Answer first

This slice delivers protected CRUD-lite for **component types, customers, vehicles, and components**. Every route requires auth v1 cookies, allows **ADMIN | SALES**, excludes `MECHANIC`, and deliberately omits delete/reassignment flows.

## What reviewers should verify

1. Customers can be created, listed, fetched, and updated with optional `notes` and `isActive` lifecycle state.
2. Vehicles always belong to an existing customer, cannot change `customerId` later, and support `isActive` lifecycle state.
3. Component types can be created ahead of time for combobox-style frontend flows and reuse a normalized unique slug.
4. Components always belong to an existing customer; any `vehicleId` link must stay inside the **same customer** boundary, every component must reference a valid `componentTypeId`, and `isActive` remains separate from work-order/status enums.

## Route families

| Resource | Routes | Notes |
| --- | --- | --- |
| Component types | `POST /component-types`, `GET /component-types`, `GET /component-types/:id`, `PATCH /component-types/:id` | Catalog for normalized component categories and combobox creation. |
| Customers | `POST /customers`, `GET /customers`, `GET /customers/options`, `GET /customers/:id`, `PATCH /customers/:id` | `notes` is optional nullable LexKit/Lexical editor-state JSON; `isActive` is optional and defaults active. |
| Vehicles | `POST /vehicles`, `GET /vehicles`, `GET /vehicles/options`, `GET /vehicles/:id`, `PATCH /vehicles/:id` | `customerId` set once on create; `isActive` is optional and defaults active. |
| Components | `POST /components`, `GET /components`, `GET /components/options`, `GET /components/:id`, `PATCH /components/:id` | `vehicleId` is optional but relation-safe; `componentTypeId` is required; `isActive` is optional and defaults active. |

## Explicit non-goals

- No `DELETE` endpoints.
- No customer reassignment for vehicles or components.
- No MECHANIC write/read access in this feature.
- No metrics or profitability scope widening for SALES.
- No boolean lifecycle state on process/history rows such as work orders, payroll, expenses, movements, or quote history.

## Reviewer shortcut

- API details: `docs/customer-assets/api-map.md`
- Validation/ownership rules: `docs/customer-assets/validation-rules.md`
- Test + Postman guide: `docs/customer-assets/testing.md`
