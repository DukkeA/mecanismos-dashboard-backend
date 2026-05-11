# Dashboard overview API map

## Quick path

Use `from=2026-04-01T00:00:00.000Z&to=2026-05-31T23:59:59.999Z` to load the seeded payment, pending expense, payroll, and unknown-payable scenarios together.

## Route

| Route | Useful query | What to verify |
|---|---|---|
| `GET /dashboard/overview` | `from=2026-04-01T00:00:00.000Z&to=2026-05-31T23:59:59.999Z` | Returns KPI sections, progress metrics, bounded alert previews, recent activity, and `metadata.approximate=true` when unknown payables exist. |

## Role contract

- Allowed: `ADMIN`, `SALES`
- Forbidden reviewer path: `MECHANIC` gets `403` on `GET /dashboard/overview`

## Stable seed scenarios

- `seed-work-order-workshop-injector-repair` — known payable and fully paid workshop order.
- `seed-work-order-workshop-partial-payment` — known payable with remaining receivable.
- `seed-work-order-workshop-unknown-payable` — payment/cost activity without a reliable payable amount.
- `seed-expense-rent-may` — pending office expense for coverage/remaining metrics.
- `seed-payroll-2026-04-finalized` — finalized payroll snapshot for payroll coverage.
