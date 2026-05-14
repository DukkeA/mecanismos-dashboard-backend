# Expenses validation rules

## Expense requests

- `name` is required on create, trimmed, string, and cannot be empty.
- `category` is required on create and must be one of the Prisma `ExpenseCategory` values.
- `amount` is required on create and must be an integer `>= 0`.
- `expectedAt` is required on create and must be a valid ISO date.
- `costCenterId` is optional, trimmed, and any unknown reference returns `404 Not Found`.
- `paidAt` is optional and marks the expense as paid when present.
- `paymentMethod` is optional, must be one of the Prisma `PaymentMethod` values, and requires `paidAt`.
- `notes` is optional, nullable LexKit/Lexical editor-state JSON. Plain strings are rejected.

## List query rules

- `page` defaults to `1`, `limit` defaults to `10`, and `limit` max is `100`.
- `search` is optional and trimmed before matching `name`. Rich-text note body search is deferred because notes are JSONB.
- `category`, `costCenterId`, and `isPaid` are optional filters.
- `expectedFrom`, `expectedTo`, `paidFrom`, and `paidTo` are optional ISO date filters.

## Boundary behavior

- Unknown expense ids return `404 Not Found` for lookup and update.
- Unknown cost-center references return `404 Not Found` on create/update.
- Validation failures stay at `400`; they do NOT mutate expenses or cost centers.
- Sending `paymentMethod` without `paidAt` returns `400` to avoid fake paid-state data.
