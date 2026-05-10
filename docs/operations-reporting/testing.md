# Operations reporting testing guide

## Quick path

- Focused artifact + seed checks: `npm run test -- src/operations-reporting/operations-reporting.seed.spec.ts src/operations-reporting/operations-reporting.artifacts.spec.ts`
- Full lane gate: `npm run test`

## Reviewer flow

1. Run `npx prisma db seed`.
2. Open `test/postman/mecanismos-dashboard-operations-reporting.postman_collection.json`.
3. Read summary first, then pending payments, work-order profitability, mechanics, and expenses.
4. Finish with the invalid date-range request and the mechanic-forbidden check.

## Why this matters

- The seed spec protects the exact fixtures reviewers depend on for partial payment, unknown payable, and paid/pending expenses.
- The artifact spec protects Postman/docs from drifting away from the real `/operations-reporting/*` routes and DTO semantics.
- `npm run test` is still the strict-TDD gate for this lane.

## Rollback order

Follow this rollback order to keep reviewer artifacts in sync.

1. Remove `docs/operations-reporting/*` and the Postman collection.
2. Remove `src/operations-reporting/operations-reporting.seed.spec.ts` and `src/operations-reporting/operations-reporting.artifacts.spec.ts`.
3. Revert the extra report fixtures in `prisma/seed-work-orders.ts` after reviewer flows stop depending on them.
