# Inventory procurement overview

This slice adds protected `inventory-items`, `inventory-movements`, and `supplier-quotes` flows for `ADMIN | SALES` so reviewers can verify catalog, stock ledger, and quote-history behavior without work-order CRUD.

## Quick path

1. Log in as admin or sales.
2. Review `GET /inventory-items` for derived stock and zero-stock demand items.
3. Review `POST /inventory-items/:id/movements` and `GET /inventory-items/:id/supplier-quotes` for ledger and quote lookup behavior.

## Scope snapshot

| Area | Decision |
|------|----------|
| Catalog | Items can be stock-owned or demand-purchased and always expose derived `currentStock`. |
| Ledger | Stock comes only from movements; negative stock is rejected by default. |
| Quotes | New prices append history; patch is correction-only; void keeps audit visibility. |
