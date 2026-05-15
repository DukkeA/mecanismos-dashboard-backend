# Customer assets API map

## Summary table

| Method | Path | Purpose | Roles |
| --- | --- | --- | --- |
| POST | `/brands` | Create or reuse normalized brand | `ADMIN`, `SALES` |
| GET | `/brands` | List brands | `ADMIN`, `SALES` |
| GET | `/brands/options` | List active brand options by default | `ADMIN`, `SALES` |
| GET | `/brands/:id` | Fetch brand | `ADMIN`, `SALES` |
| PATCH | `/brands/:id` | Update brand | `ADMIN`, `SALES` |
| POST | `/component-types` | Create component type | `ADMIN`, `SALES` |
| GET | `/component-types` | List component types | `ADMIN`, `SALES` |
| GET | `/component-types/:id` | Fetch component type | `ADMIN`, `SALES` |
| PATCH | `/component-types/:id` | Update component type | `ADMIN`, `SALES` |
| POST | `/customers` | Create customer | `ADMIN`, `SALES` |
| GET | `/customers` | List customers | `ADMIN`, `SALES` |
| GET | `/customers/options` | List active customer options by default | `ADMIN`, `SALES` |
| GET | `/customers/:id` | Fetch customer | `ADMIN`, `SALES` |
| PATCH | `/customers/:id` | Update customer | `ADMIN`, `SALES` |
| POST | `/vehicles` | Create vehicle | `ADMIN`, `SALES` |
| GET | `/vehicles` | List vehicles | `ADMIN`, `SALES` |
| GET | `/vehicles/options` | List active vehicle options by default | `ADMIN`, `SALES` |
| GET | `/vehicles/:id` | Fetch vehicle | `ADMIN`, `SALES` |
| PATCH | `/vehicles/:id` | Update vehicle | `ADMIN`, `SALES` |
| POST | `/components` | Create component | `ADMIN`, `SALES` |
| GET | `/components` | List components | `ADMIN`, `SALES` |
| GET | `/components/options` | List active component options by default | `ADMIN`, `SALES` |
| GET | `/components/:id` | Fetch component | `ADMIN`, `SALES` |
| PATCH | `/components/:id` | Update component | `ADMIN`, `SALES` |

## Query map

### Brands
- `GET /brands?page=1&limit=10&search=bosch&isActive=true`
- `GET /brands/options` defaults to active-only; use `?isActive=false` for inactive options.

### Component types
- `GET /component-types?page=1&limit=10&search=inye&isActive=true`

### Customers
- `GET /customers?page=1&limit=10&search=ana&documentType=CEDULA&isActive=false`
- `GET /customers/options` defaults to active-only; use `?isActive=false` for inactive options.

### Vehicles
- `GET /vehicles?page=1&limit=10&customerId=customer-1&search=mazda&isActive=false`
- `GET /vehicles/options` defaults to active-only; use `?isActive=false` for inactive options.

### Components
- `GET /components?page=1&limit=10&customerId=customer-1&vehicleId=vehicle-1&componentTypeId=component-type-1&search=bosch&isActive=false`
- `GET /components/options` defaults to active-only; use `?isActive=false` for inactive options.

## Update semantics

| Route | Mutable fields | Guardrails |
| --- | --- | --- |
| `PATCH /customers/:id` | Name, phone, document, email, notes, `isActive` | Standard validation + duplicate customer document conflict. |
| `PATCH /brands/:id` | Name, `isActive` | Name is normalized to a case-insensitive unique key. |
| `PATCH /vehicles/:id` | Brand display string, modelReference, plate, notes, `isActive` | `customerId` is immutable. Create-time aggregate behavior is on `POST /vehicles`, not update. |
| `PATCH /component-types/:id` | Name, slug, description, `isActive` | Slug stays unique after normalization. |
| `PATCH /components/:id` | Brand display string, reference, identifier, notes, `vehicleId`, `componentTypeId`, `isActive` | `customerId` is immutable; `vehicleId` must remain in the same customer boundary or be cleared; `componentTypeId` must reference an existing type. Create-time aggregate behavior is on `POST /components`, not update. |

## Standard create aggregate payloads

Use the standard REST create endpoints for inline create/connect flows. Do not add `/with-related` endpoints and do not require `/quick-create` for this UX.

| Route | Existing references | Inline creation fields | Brand contract |
| --- | --- | --- | --- |
| `POST /vehicles` | `customerId`, `brandId` | `customer: { name, phone, documentType, documentNumber, email?, notes?, isActive? }` | `brandId`, `brandName`, `brand: "Bosch"`, or `brand: { name: "Bosch" }`; names reuse the normalized brand row. |
| `POST /components` | `customerId`, `componentTypeId`, `brandId`, optional `vehicleId` | `customer`, `componentType: { name, slug? }`, optional `vehicle: { brandId? brand? brandName?, modelReference, plate, notes?, isActive? }` | Same brand contract as vehicles; inline vehicle brand is resolved independently. |

## Reviewer callouts

- `POST /brands` and `GET /brands/options` support brand comboboxes; aggregate creates can also find-or-create a brand by normalized name.
- `POST /component-types` lets the frontend create new combobox options without storing free-text component categories.
- `POST /components` and `PATCH /components/:id` validate cross-resource ownership; inline component vehicle creation is always scoped to the resolved customer.
- `PATCH /vehicles/:id` and `PATCH /components/:id` reject reassignment by schema/DTO contract rather than silently ignoring it.
- There is intentionally **no** delete surface.
