# Customer assets API map

## Summary table

| Method | Path | Purpose | Roles |
| --- | --- | --- | --- |
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

### Customers
- `GET /customers?page=1&limit=10&search=ana&documentType=CEDULA`

### Vehicles
- `GET /vehicles?page=1&limit=10&customerId=customer-1&search=mazda`

### Components
- `GET /components?page=1&limit=10&customerId=customer-1&vehicleId=vehicle-1&search=bosch`

## Update semantics

| Route | Mutable fields | Guardrails |
| --- | --- | --- |
| `PATCH /customers/:id` | Name, phone, document, email, notes | Standard validation + duplicate customer document conflict. |
| `PATCH /vehicles/:id` | Brand, modelReference, plate, notes | `customerId` is immutable. |
| `PATCH /components/:id` | Brand, reference, identifier, notes, `vehicleId` | `customerId` is immutable; `vehicleId` must remain in the same customer boundary or be cleared. |

## Reviewer callouts

- `POST /components` and `PATCH /components/:id` are the only routes with cross-resource ownership validation.
- `PATCH /vehicles/:id` and `PATCH /components/:id` reject reassignment by schema/DTO contract rather than silently ignoring it.
- There is intentionally **no** delete surface.
