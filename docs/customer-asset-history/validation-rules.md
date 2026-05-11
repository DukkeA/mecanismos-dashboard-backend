# Customer asset history validation rules

## Query validation

- `page` must be an integer greater than or equal to `1`.
- `limit` must be an integer between `1` and `100`.
- `dateField` must be one of `createdAt`, `completedAt`, or `estimatedCollectionAt`.
- `status`, `paymentStatus`, and `type` must match supported Prisma enums.
- `dateTo` must be greater than or equal to `dateFrom`.

## Filtering semantics

- If `dateField` is omitted, history defaults to `createdAt`.
- Date filters scope **which work orders appear**, not which payments/costs contribute inside each returned row.
- Unknown payable orders keep `payableAmount` and `balance` as `null`; they are excluded from payable/balance summary totals instead of being coerced to zero.

## Error expectations

- Missing customer/vehicle/component IDs return `404`.
- Invalid query combinations return `400` before broad reads execute.
- Unauthorized users return `401`; authenticated `MECHANIC` users return `403`.
