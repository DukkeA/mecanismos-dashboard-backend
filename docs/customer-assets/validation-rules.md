# Customer assets validation rules

## Ownership rules

1. `customerId is immutable` for vehicles and components after creation.
2. A component can reference a vehicle only when that vehicle belongs to the **same customer**.
3. Every component must reference an existing normalized `componentTypeId`.
4. Component `vehicleId` may be omitted on create and may be cleared on update.

## Error contract

| Situation | Status |
| --- | --- |
| Missing customer parent | `404 Not Found` |
| Missing vehicle referenced by component | `404 Not Found` |
| Missing component type referenced by component | `404 Not Found` |
| Cross-customer component/vehicle mismatch | `400 Bad Request` |
| Duplicate customer document | `409 Conflict` |
| Duplicate vehicle plate | `409 Conflict` |
| Duplicate component type slug | `409 Conflict` |
| Unauthenticated request | `401 Unauthorized` |
| Authenticated `MECHANIC` request | `403 Forbidden` |

## Normalization rules

- Trim all string inputs.
- Lowercase customer email.
- Normalize component type slugs to lowercase kebab-case without accents.
- Uppercase vehicle plate.
- Treat empty optional strings as absent/null when persisted.
- Keep `notes` as opaque rich-text strings in v1.

## Search/list rules

| Resource | Search fields | Extra filters |
| --- | --- | --- |
| Customers | `name`, `documentNumber`, `phone` | `documentType` |
| Vehicles | `plate`, `brand`, `modelReference` | `customerId` |
| Component types | `name`, `slug`, `description` | `isActive` |
| Components | `identifier`, `reference`, `brand` | `customerId`, `vehicleId`, `componentTypeId` |

## Scope guardrails

- `ADMIN | SALES` only.
- No `DELETE` endpoints.
- No customer reassignment.
- No non-customer-assets features in this change.
