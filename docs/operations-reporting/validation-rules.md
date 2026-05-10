# Operations reporting validation rules

## Shared query contract

- Every route accepts optional `dateFrom` and `dateTo`.
- Both values must be valid ISO date/date-time strings.
- `dateFrom > dateTo` returns `400 Bad Request`.

## Report-specific filters

- `GET /operations-reporting/pending-payments`: `customerId`, `paymentStatus`, `status`
- `GET /operations-reporting/work-order-profitability`: `customerId`, `assignedEmployeeId`, `status`
- `GET /operations-reporting/mechanics`: `assignedEmployeeId`, `employeeType`, `includeInactiveMechanics`
- `GET /operations-reporting/expenses`: `costCenterId`, `expenseCategory`, `paymentStatus`

## Semantics that matter

- Unknown payable stays `null`; it NEVER becomes zero just to simplify math.
- Pending balances stay `null` when payable is unknown.
- Expense grouping splits paid rows by `paidAt` and pending rows by `expectedAt`.
- Summary and mechanics are approximate, cash-operational reads, not formal accounting outputs.
