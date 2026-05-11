# App settings overview

## Answer first

This slice adds a pricing/labor singleton so quoting defaults stop living in spreadsheets or memory. `ADMIN | SALES` can read the current settings, but only `ADMIN` can update them.

## Quick path

1. Run `npx prisma db seed`.
2. Open `test/postman/mecanismos-dashboard-app-settings.postman_collection.json`.
3. Read as SALES, update as ADMIN, then re-read as SALES to confirm the singleton persisted.

## What reviewers should verify

1. `GET /app-settings/pricing-labor` returns the current singleton values with no generated ID lookup.
2. `PATCH /app-settings/pricing-labor` accepts valid ADMIN updates and rejects invalid payloads.
3. SALES can read but cannot patch.
4. These settings affect only future estimate preparation; existing estimate snapshots stay historical.
