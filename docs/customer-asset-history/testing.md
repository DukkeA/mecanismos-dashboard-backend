# Customer asset history testing guide

## Fast feedback

- Unit/integration loop: `npm run test -- src/customer-asset-history/...`
- Full project unit runner used during apply: `npm run test`
- Real DB contract check: `npm run test:e2e -- test/customer-asset-history/customer-asset-history.e2e-spec.ts`

## What to verify

- Customer, vehicle, and component reads return the same response contract.
- Pagination metadata stays stable when `limit=1` and ordering uses the selected date field with a number tie-breaker.
- Summary totals match the filtered scope and still honor Postman checks for unknown payable orders.
- Mutation attempts under `/customer-asset-history/*` stay unavailable.

## Postman

Use the supplemental Postman collection in `test/postman/mecanismos-dashboard-customer-asset-history.postman_collection.json` for reviewer-facing verification after seeding the database.
