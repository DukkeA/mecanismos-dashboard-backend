# Work orders testing guide

## Quick path

- Focused artifact + seed checks: `npm run test -- src/work-orders/work-orders.seed.spec.ts src/work-orders/work-orders.artifacts.spec.ts`
- Full regression requested for this lane: `npm run test`
- Inventory reserve/release/consume/sell verification lives in the work-order e2e and Postman flow.

## Reviewer flow

1. Run `npx prisma db seed`.
2. Read `GET /work-orders/seed-work-order-sale-counter-quote` and `GET /work-orders/seed-work-order-workshop-injector-repair` from Postman first.
3. Run the Postman runner flow to create one new workshop order, then verify inventory reserve/release/consume/sell requests capture the created movement id, estimate and cost requests use `{{unboundSupplierQuoteId}}` (`seed-supplier-quote-bosch-central-v1`), and payment requests reuse captured IDs.

## Why this matters

- The seed spec protects idempotent stable IDs for docs and reviewer reads.
- The artifact spec protects docs and Postman from drifting back to generated IDs.
- The seeded quote `seed-supplier-quote-bosch-central-v2` is intentionally bound to `seed-work-order-workshop-injector-repair`, so created-order flows must not reuse it.
- `npm run test` is the lane gate because strict TDD is active.

## Rollback order

1. Remove the work-order seed helper and its `prisma/seed.ts` hook.
2. Remove `docs/work-orders/*` and the Postman collection.
3. Remove `src/work-orders/work-orders.seed.spec.ts` and `src/work-orders/work-orders.artifacts.spec.ts`.
