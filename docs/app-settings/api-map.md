# App settings API map

Quick routes: GET /app-settings/pricing-labor, PATCH /app-settings/pricing-labor, GET /app-settings/pricing-labor/history

## Endpoints

| Method | Route | Input | Output | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/app-settings/pricing-labor` | None | Current singleton pricing/labor settings | `ADMIN | SALES` only |
| `PATCH` | `/app-settings/pricing-labor` | Partial pricing/labor DTO | Updated singleton pricing/labor settings | `ADMIN` only |
| `GET` | `/app-settings/pricing-labor/history?page=1&limit=20` | Pagination query | Paginated audit rows with actor, changed fields, and before/after values | `ADMIN | SALES` only, newest first |

## Response fields

- `companyName`
- `currencyCode`
- `monthlyWorkingHours`
- `defaultLaborHourlyRate`
- `saleContingencyPct`
- `workshopContingencyPct`
- `diagnosticContingencyPct`
- `minimumMarkupPct`
- `recommendedMarkupPct`
- `highMarkupPct`
- `updatedAt`

## History response fields

- `data[].id`
- `data[].actorUserId`
- `data[].changedFields`
- `data[].beforeValues`
- `data[].afterValues`
- `data[].createdAt`
- `meta.page`
- `meta.limit`
- `meta.total`

## Error contract

| Status | Trigger |
| --- | --- |
| `400` | Invalid currency/range payload |
| `400` | Empty PATCH payload or values identical to the current singleton |
| `401` | Missing or invalid auth cookie |
| `403` | Authenticated role is not allowed for the route |
