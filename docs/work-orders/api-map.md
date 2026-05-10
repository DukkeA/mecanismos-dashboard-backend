# Work orders API map

Quick routes: POST /work-orders, GET /work-orders, GET /work-orders/:id, PATCH /work-orders/:id, PUT /work-orders/:id/estimates/:phase, POST /work-orders/:id/payments

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
| `POST` | `/work-orders/:id/payments` | Payment payload | Created payment | Payment status derives from totals when available |
| `GET` | `/work-orders/:id/payments` | Path id | Payment list | Use captured IDs in runner flow |

## Error contract

| Status | Trigger |
| --- | --- |
| `400` | Invalid enum, malformed date/number, or workshop-only mismatch |
| `401` | Missing or invalid auth cookie |
| `403` | Authenticated role is not `ADMIN` or `SALES` |
| `404` | Unknown work order or missing related entity |

## Seed read examples

- `GET /work-orders/seed-work-order-sale-counter-quote`
- `GET /work-orders/seed-work-order-workshop-injector-repair`
