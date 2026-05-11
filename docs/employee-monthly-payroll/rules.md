# Employee monthly payroll rules

## Generation

- Periods use `{ year, month }` and a UTC month window `[start, end)`.
- Generating an existing `DRAFT` replaces its lines and recalculates totals.
- Generating a `FINALIZED` period is rejected.

## Snapshot semantics

- One snapshot line is created per currently active employee.
- Each line stores copied employee and cost-center identity data.
- Only paid bonuses inside the month affect `bonusTotal`.

## Finalization

- Finalization sets `status=FINALIZED` and `finalizedAt`.
- Finalized periods are immutable finalized periods: no regenerate, no line replacement, no total mutation.
