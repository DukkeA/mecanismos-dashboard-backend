# Inventory procurement validation rules

## Core rules

- Negative stock is rejected with a client conflict instead of silently drifting the ledger.
- Demand-purchased items keep `currentStock=0` until future scope introduces a different stock policy.
- Supplier quotes are append-only for price refreshes.
- `PATCH /supplier-quotes/:id` is correction-only and requires `correctionReason`.
- `PATCH /supplier-quotes/:id/void` preserves history and removes the row from default latest-valid summaries.

## Future-safe boundaries

- No public `workOrderId` field is exposed on v1 movement or quote write DTOs.
- Quote linkage fields exist only as internal schema extension points.
