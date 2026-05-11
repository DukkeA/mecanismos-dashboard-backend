# Employee monthly payroll overview

This module adds a simple monthly employee payroll close with `DRAFT` and `FINALIZED` lifecycle states.

## Reviewer flow

1. Use an `ADMIN` account to `POST /employee-monthly-payroll/generate` for a `{ year, month }` period.
2. Review snapshot lines, salary totals, and paid bonuses captured inside the month.
3. Finalize the draft with `POST /employee-monthly-payroll/:id/finalize`.
4. Confirm finalized periods stay immutable.

## Scope limits

- This is a payroll close snapshot, NOT legal liquidation or accounting posting.
- Only currently active employees are included at generation time.
- Bonus totals only include bonuses whose `paidAt` falls inside the UTC month window.
