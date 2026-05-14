# Expenses API map

Quick routes: POST /expenses, GET /expenses, GET /expenses/:id, PATCH /expenses/:id

## Endpoints

| Method | Route | Input | Output | Notes |
| --- | --- | --- | --- | --- |
| `POST` | `/expenses` | `name`, `category`, `amount`, `expectedAt`, optional `costCenterId`, optional `paidAt`, optional `paymentMethod`, optional `notes` | Created expense row | `paymentMethod` requires `paidAt`; unknown cost center returns `404` |
| `GET` | `/expenses?page=&limit=&search=&category=&costCenterId=&isPaid=&expectedFrom=&expectedTo=&paidFrom=&paidTo=` | Query params only | `{ data, meta }` pagination envelope | Search covers `name`; rich-text note body search is deferred |
| `GET` | `/expenses/:id` | Path id | Single expense row | `404` if missing |
| `PATCH` | `/expenses/:id` | Partial expense payload | Updated expense row | Clearing `paidAt` clears `paymentMethod` |

## Error contract

| Status | Trigger |
| --- | --- |
| `400` | Empty/invalid strings, invalid enums, invalid pagination bounds, invalid unpaid/payment payload |
| `401` | Missing or invalid auth cookie |
| `403` | Authenticated role is not `ADMIN` or `SALES` |
| `404` | Unknown expense id or unknown cost-center reference |

## Example scheduled payload

```json
{
  "name": "Arriendo sede mayo",
  "category": "RENT",
  "amount": 1500000,
  "expectedAt": "2026-05-15T00:00:00.000Z",
  "costCenterId": "seed-cost-center-oficina",
  "notes": { "root": { "type": "root", "children": [] } }
}
```

## Example paid update payload

```json
{
  "paidAt": "2026-05-16T14:00:00.000Z",
  "paymentMethod": "TRANSFER",
  "notes": { "root": { "type": "root", "children": [] } }
}
```
