# Operations reporting API map

## Quick path

Use one date window that includes April and May 2026 so the seeded payment, pending, and expense scenarios all show up together:

`dateFrom=2026-04-01T00:00:00.000Z&dateTo=2026-05-31T23:59:59.999Z`

## Routes

| Route | Useful seeded filters | What to verify |
|---|---|---|
| `GET /operations-reporting/summary` | none | `approximate`, `basis`, lifecycle counts, payment buckets, pending receivables, paid/pending expenses. |
| `GET /operations-reporting/pending-payments` | `paymentStatus=PARTIAL` | Includes `seed-work-order-workshop-partial-payment` with numeric `balance` and `seed-work-order-workshop-unknown-payable` with `balance: null`. |
| `GET /operations-reporting/work-order-profitability` | `assignedEmployeeId=seed-employee-ana-torres` | Known-payable rows expose gross values; unknown-payable row keeps `payableAmount`, `grossUtility`, and `grossMargin` as `null`. |
| `GET /operations-reporting/mechanics` | `assignedEmployeeId=seed-employee-ana-torres` | One mechanic row aggregates assigned work only and shows `unknownPayableCount`. |
| `GET /operations-reporting/expenses` | none | Pending rent uses `expectedAt`; paid utility uses `paidAt`; grouped rows surface category, payment state, and optional cost center. |

## Role contract

- Allowed: `ADMIN`, `SALES`
- Forbidden example for reviewer path: `MECHANIC` gets `403` on `GET /operations-reporting/summary`
