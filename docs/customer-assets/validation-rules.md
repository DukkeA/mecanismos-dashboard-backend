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
- Keep `notes` as opaque LexKit/Lexical editor-state JSON objects or `null`; plain strings are rejected.
- `isActive` body fields must be JSON booleans; query `isActive` accepts only `true` or `false` strings and rejects values like `yes`, `0`, or `inactive`.

## Search/list rules

| Resource | Search fields | Extra filters |
| --- | --- | --- |
| Customers | `name`, `documentNumber`, `phone` | `documentType`, `isActive` |
| Vehicles | `plate`, `brand`, `modelReference` | `customerId`, `isActive` |
| Component types | `name`, `slug`, `description` | `isActive` |
| Components | `identifier`, `reference`, `brand` | `customerId`, `vehicleId`, `componentTypeId`, `isActive` |

## Lifecycle rules

- `Customer`, `Vehicle`, and `Component` records default to `isActive=true` when omitted on create.
- List endpoints do not filter lifecycle state unless `?isActive=true|false` is present.
- Options endpoints default to active-only and support `?isActive=false` for inactive-only picker data.
- Detail and update by id still work for inactive records.
- Work orders, payroll, expenses, inventory movements, quote history, and other process/history rows keep their enum/status fields instead of gaining `isActive`.

## Scope guardrails

- `ADMIN | SALES` only.
- No `DELETE` endpoints.
- No customer reassignment.
- No non-customer-assets features in this change.
