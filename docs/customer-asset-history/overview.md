# Customer asset history overview

This reviewer guide covers the new **read-only** customer asset history capability for **customers, vehicles, and components**.

## Why it exists

- Reception/admin users need concise historical context without loading the full work-order detail graph.
- Financial totals stay aligned with operations reporting because the service reuses the same payable/balance semantics.
- Access stays limited to `ADMIN | SALES` and the routes expose only `GET` handlers.

## Response shape

Every route returns:

- `subject` — the customer, vehicle, or component being queried.
- `relatedAssets` — adjacent asset summaries that help the frontend navigate laterally.
- `summary` — scoped totals for work orders, payable, paid, balance, and actual cost.
- `data` — concise work-order rows with detail link identifiers.
- `meta` — pagination metadata.

## Seeded reviewer examples

- `seed-customer-acme-industrial`
- `seed-vehicle-acme-foton-aumark`
- `seed-component-acme-inyector`

The Acme seed path intentionally includes one completed payable-known workshop order and one in-progress unknown-payable workshop order so reviewers can validate both summary branches.
