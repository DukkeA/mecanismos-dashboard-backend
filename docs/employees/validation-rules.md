# Employees validation rules

## Employee requests

- `name` is required, trimmed, string, and cannot be empty.
- `type` is required and must be one of the Prisma `EmployeeType` values.
- `phone` is optional and trimmed when present.
- `baseSalaryMonthly` is required and must be `>= 0`.
- `costCenterId` is optional, trimmed, and any unknown reference returns `404 Not Found`.
- `isActive` is optional on create/update and defaults to `true` on create.

## List query rules

- `page` defaults to `1`, `limit` defaults to `10`, and `limit` max is `100`.
- `search` is optional and trimmed before matching identity fields.
- `type`, `isActive`, and `costCenterId` are optional filters.

## Bonus rules

- `amount` is required and must be greater than `0`.
- `paidAt` is required and must be a valid ISO date.
- `description` is optional and trimmed when present.
- `paymentMethod` is optional and must be one of the Prisma `PaymentMethod` values when provided.
- `from` and `to` filters are optional on `GET /employees/:id/bonuses` and operate over `paidAt`.

## Boundary behavior

- Unknown employee ids return `404 Not Found` for employee lookup, update, and bonus routes.
- Unknown cost-center references return `404 Not Found` on employee create/update.
- Validation failures stay at `400`; they do NOT mutate employees, bonuses, or cost centers.
