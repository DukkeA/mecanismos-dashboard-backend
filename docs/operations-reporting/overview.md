# Operations reporting overview

Operational reporting gives ADMIN and SALES a quick, cash-operational view of work, collections, costs, expenses, and mechanic output. These routes are REVIEW tools, not accounting statements: they preserve approximate semantics and keep unknown payable values as `null` instead of inventing certainty.

## Quick path

1. Run `npx prisma db seed`.
2. Log in as `admin@mecanismos.test` or `ventas@mecanismos.test`.
3. Run `test/postman/mecanismos-dashboard-operations-reporting.postman_collection.json` starting with summary, then receivables, profitability, mechanics, and expenses.

## Stable seed scenarios

| Scenario | Stable ID | Why it exists |
|---|---|---|
| Known payable, full payment | `seed-work-order-workshop-injector-repair` | Baseline paid workshop row with assigned mechanic and FINAL estimate. |
| Partial payment with known payable | `seed-work-order-workshop-partial-payment` | Exercises pending receivables with a non-null balance. |
| Unknown payable with costs + payment | `seed-work-order-workshop-unknown-payable` | Protects `payableAmount`, `balance`, and derived profitability fields staying `null`. |
| Pending office expense | `seed-expense-rent-may` | Exercises pending expense grouping by `expectedAt`. |
| Paid general expense | `seed-expense-utility-power-april` | Exercises paid expense grouping by `paidAt`. |

## Report semantics

- All responses are `approximate: true` with `basis: cash-operational`.
- Date windows are inclusive, but each metric uses its own source timestamp.
- Pending receivables and profitability never coerce unknown payable amounts to zero.
- Mechanic rows include assigned work only; no overhead, salary, or unassigned work allocation.
