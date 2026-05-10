# Cost centers API map

Quick routes: POST /cost-centers, GET /cost-centers, GET /cost-centers/:id, PATCH /cost-centers/:id

## Endpoints

| Method | Route | Input | Output | Notes |
| --- | --- | --- | --- | --- |
| `POST` | `/cost-centers` | `code`, `name`, optional `isActive` | Created `CostCenter` row | `code` is canonicalized before persistence |
| `GET` | `/cost-centers?page=&limit=&search=&isActive=` | Query params only | `{ data, meta }` pagination envelope | Search covers `code` and `name` |
| `GET` | `/cost-centers/:id` | Path id | Single `CostCenter` row | `404` if missing |
| `PATCH` | `/cost-centers/:id` | Partial create payload | Updated `CostCenter` row | Supports lifecycle toggles without delete |

## Error contract

| Status | Trigger |
| --- | --- |
| `400` | Empty/invalid `code`, `name`, or query booleans/integers |
| `401` | Missing or invalid auth cookie |
| `403` | Authenticated role is not `ADMIN` or `SALES` |
| `404` | Unknown cost-center id |
| `409` | Canonical code collision |

## Example create payload

```json
{
  "code": "  bodega  ",
  "name": "Bodega principal",
  "isActive": true
}
```
