# Work orders overview

## Answer first

This slice gives reviewers a fast path for seeded and runner-created `/work-orders` flows without relying on generated IDs. Use the stable seed IDs `seed-work-order-sale-counter-quote` and `seed-work-order-workshop-injector-repair` for read-only verification, then let Postman capture fresh IDs for mutations and inventoryActivity flows.

## Quick path

1. Run `npx prisma db seed`.
2. Open `test/postman/mecanismos-dashboard-work-orders.postman_collection.json`.
3. Read the seeded SALE and WORKSHOP orders first, then run the create/estimate/inventory/cost/payment flow that captures `createdWorkOrderId` automatically.

## What reviewers should verify

1. `SALE` data reads cleanly without `workshopDetails`.
2. `WORKSHOP` data returns `workshopDetails`, linked estimate lines, inventoryActivity, actual cost, and payment artifacts.
3. Runner requests create one new work order and capture every downstream ID instead of assuming generated IDs.
4. `ADMIN | SALES` work; `MECHANIC` is denied.

## Stable seed records

| Record | Stable ID | Why it exists |
| --- | --- | --- |
| Sale work order | `seed-work-order-sale-counter-quote` | Minimal SALE example with no workshop-only persistence |
| Workshop work order | `seed-work-order-workshop-injector-repair` | Full WORKSHOP example with detail, FINAL estimate, actual cost, and payment |
| Workshop detail | `seed-workshop-details-injector-repair` | Shows the single-detail WORKSHOP contract |

## Reviewer shortcut

- API details: `docs/work-orders/api-map.md`
- Validation rules: `docs/work-orders/validation-rules.md`
- Test and Postman workflow: `docs/work-orders/testing.md`
