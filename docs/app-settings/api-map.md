# App settings API map

Quick routes: GET /app-settings/pricing-labor, PATCH /app-settings/pricing-labor

## Endpoints

| Method | Route | Input | Output | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/app-settings/pricing-labor` | None | Current singleton pricing/labor settings | `ADMIN | SALES` only |
| `PATCH` | `/app-settings/pricing-labor` | Partial pricing/labor DTO | Updated singleton pricing/labor settings | `ADMIN` only |

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

## Error contract

| Status | Trigger |
| --- | --- |
| `400` | Invalid currency/range payload |
| `401` | Missing or invalid auth cookie |
| `403` | Authenticated role is not allowed for the route |
