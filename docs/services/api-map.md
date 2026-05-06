# Services API map

Quick routes: POST /services, GET /services, GET /services/:id, PATCH /services/:id

## Endpoints

| Method | Route | Input | Output | Notes |
| --- | --- | --- | --- | --- |
| `POST` | `/services` | `name`, optional `description`, optional `isActive` | Created `ServiceCatalog` row | `slug` is derived from `name` |
| `GET` | `/services?page=&limit=&search=&isActive=` | Query params only | `{ data, meta }` pagination envelope | Search covers `name`, `slug`, `description` |
| `GET` | `/services/:id` | Path id | Single `ServiceCatalog` row | `404` if missing |
| `PATCH` | `/services/:id` | Partial create payload | Updated `ServiceCatalog` row | Renaming regenerates `slug` |

## Error contract

| Status | Trigger |
| --- | --- |
| `400` | Empty/invalid `name`, invalid query booleans/integers |
| `401` | Missing or invalid auth cookie |
| `403` | Authenticated role is not `ADMIN` or `SALES` |
| `404` | Unknown service id |
| `409` | Canonical slug collision |

## Example create payload

```json
{
  "name": "Diagnóstico electrónico",
  "description": "Lectura inicial de fallas",
  "isActive": true
}
```
