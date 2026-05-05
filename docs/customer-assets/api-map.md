# Customer assets API map

## Summary table

| Method | Path | Purpose | Roles |
| --- | --- | --- | --- |
| POST | `/component-types` | Create component type | `ADMIN`, `SALES` |
| GET | `/component-types` | List component types | `ADMIN`, `SALES` |
| GET | `/component-types/:id` | Fetch component type | `ADMIN`, `SALES` |
| PATCH | `/component-types/:id` | Update component type | `ADMIN`, `SALES` |
| POST | `/customers` | Create customer | `ADMIN`, `SALES` |
| GET | `/customers` | List customers | `ADMIN`, `SALES` |
| GET | `/customers/:id` | Fetch customer | `ADMIN`, `SALES` |
| PATCH | `/customers/:id` | Update customer | `ADMIN`, `SALES` |
| POST | `/vehicles` | Create vehicle | `ADMIN`, `SALES` |
| GET | `/vehicles` | List vehicles | `ADMIN`, `SALES` |
| GET | `/vehicles/:id` | Fetch vehicle | `ADMIN`, `SALES` |
| PATCH | `/vehicles/:id` | Update vehicle | `ADMIN`, `SALES` |
| POST | `/components` | Create component | `ADMIN`, `SALES` |
| GET | `/components` | List components | `ADMIN`, `SALES` |
| GET | `/components/:id` | Fetch component | `ADMIN`, `SALES` |
| PATCH | `/components/:id` | Update component | `ADMIN`, `SALES` |

## Query map

### Component types
- `GET /component-types?page=1&limit=10&search=inye&isActive=true`

### Customers
- `GET /customers?page=1&limit=10&search=ana&documentType=CEDULA`

### Vehicles
- `GET /vehicles?page=1&limit=10&customerId=customer-1&search=mazda`

### Components
- `GET /components?page=1&limit=10&customerId=customer-1&vehicleId=vehicle-1&componentTypeId=component-type-1&search=bosch`

## Update semantics

| Route | Mutable fields | Guardrails |
| --- | --- | --- |
| `PATCH /customers/:id` | Name, phone, document, email, notes | Standard validation + duplicate customer document conflict. |
| `PATCH /vehicles/:id` | Brand, modelReference, plate, notes | `customerId` is immutable. |
| `PATCH /component-types/:id` | Name, slug, description, `isActive` | Slug stays unique after normalization. |
| `PATCH /components/:id` | Brand, reference, identifier, notes, `vehicleId`, `componentTypeId` | `customerId` is immutable; `vehicleId` must remain in the same customer boundary or be cleared; `componentTypeId` must reference an existing type. |

## Reviewer callouts

- `POST /component-types` lets the frontend create new combobox options without storing free-text component categories.
- `POST /components` and `PATCH /components/:id` are the only routes with cross-resource ownership validation.
- `PATCH /vehicles/:id` and `PATCH /components/:id` reject reassignment by schema/DTO contract rather than silently ignoring it.
- There is intentionally **no** delete surface.
