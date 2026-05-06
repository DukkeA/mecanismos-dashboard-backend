# Inventory procurement testing guide

## Quick verification

1. Run `npm run test` for unit and artifact checks.
2. Run `npm run test:e2e` for route-contract coverage.
3. Open the Postman collection and execute the inventory + procurement folder.

## Reviewer flows

- Confirm `GET /inventory-items` returns a stock-owned row with `currentStock > 0` and a demand-purchased row with `currentStock = 0`.
- Confirm `POST /inventory-items/:id/movements` rejects a negative stock attempt.
- Confirm `POST /supplier-quotes` creates a new event, then `PATCH /supplier-quotes/:id/void` keeps it visible in supplier history.

## Notes

- `npm run test:e2e` keeps Prisma mocked/lightweight for fast contract verification.
- Postman provides the same happy path for manual review without running a build.
