# Work orders API map

Quick routes: POST /work-orders, GET /work-orders, GET /work-orders/:id, PATCH /work-orders/:id, PUT /work-orders/:id/estimates/:phase, POST /work-orders/:id/inventory/reservations, POST /work-orders/:id/inventory/releases, POST /work-orders/:id/inventory/consumptions, POST /work-orders/:id/inventory/sales, POST /work-orders/:id/payments

## Endpoints

| Method | Route | Input | Output | Notes |
| --- | --- | --- | --- | --- |
| `POST` | `/work-orders` | SALE or WORKSHOP payload | Created work order detail | WORKSHOP may include workshop-only fields |
| `GET` | `/work-orders?page=&limit=&type=&status=&paymentStatus=&customerId=&search=` | Query params only | `{ data, meta }` pagination envelope | Search covers number + summary |
| `GET` | `/work-orders/:id` | Path id | Single work order detail | Stable seed IDs are safe for reviewer reads |
| `PATCH` | `/work-orders/:id` | Partial create payload | Updated work order detail | No hard-delete path exists |
| `PUT` | `/work-orders/:id/estimates/:phase` | Estimate payload + lines | Upserted estimate detail | `phase` is `INITIAL` or `FINAL` |
| `GET` | `/work-orders/:id/estimates` | Path id | Estimate list | Includes line summaries |
| `POST` | `/work-orders/:id/actual-costs` | Actual-cost payload | Created actual cost | `DIRECT_PURCHASE` requires supplier validation |
| `GET` | `/work-orders/:id/actual-costs` | Path id | Actual-cost list | Keeps parent work order intact |
| `POST` | `/work-orders/:id/inventory/reservations` | Reserve payload | `{ movement, currentStockAfter, workOrderInventory }` | Uses `WORK_ORDER_PURCHASE` and marks the ledger row as reserved |
| `POST` | `/work-orders/:id/inventory/releases` | Release payload | `{ movement, currentStockAfter, workOrderInventory }` | Uses compensating `RETURN` ledger activity; no row is deleted |
| `POST` | `/work-orders/:id/inventory/consumptions` | Consume payload | `{ movement, actualCost?, currentStockAfter, workOrderInventory }` | Optional actual cost is created atomically |
| `POST` | `/work-orders/:id/inventory/sales` | Sale payload | `{ movement, actualCost?, currentStockAfter, workOrderInventory }` | Shares the same quote/item validation contract |
| `POST` | `/work-orders/:id/payments` | Payment payload | Created payment | Payment status derives from totals when available |
| `GET` | `/work-orders/:id/payments` | Path id | Payment list | Use captured IDs in runner flow |

## Error contract

| Status | Trigger |
| --- | --- |
| `400` | Invalid enum, malformed date/number, or workshop-only mismatch |
| `400` | Demand-purchased item used in a physical reserve/release/consume/sell action |
| `401` | Missing or invalid auth cookie |
| `403` | Authenticated role is not `ADMIN` or `SALES` |
| `404` | Unknown work order or missing related entity |

## Seed read examples

- `GET /work-orders/seed-work-order-sale-counter-quote`
- `GET /work-orders/seed-work-order-workshop-injector-repair`
