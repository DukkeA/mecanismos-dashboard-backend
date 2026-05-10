# Employees API map

Quick routes: POST /employees, GET /employees, GET /employees/:id, PATCH /employees/:id, GET /employees/cost-center-options, POST /employees/:id/bonuses, GET /employees/:id/bonuses

## Endpoints

| Method | Route | Input | Output | Notes |
| --- | --- | --- | --- | --- |
| `POST` | `/employees` | `name`, `type`, `baseSalaryMonthly`, optional `phone`, optional `costCenterId`, optional `isActive` | Created employee row | Unknown cost center returns `404` |
| `GET` | `/employees?page=&limit=&search=&type=&isActive=&costCenterId=` | Query params only | `{ data, meta }` pagination envelope | Search covers employee identity fields |
| `GET` | `/employees/cost-center-options` | None | Array of cost-center options | Read-only reference route |
| `GET` | `/employees/:id` | Path id | Single employee row | `404` if missing |
| `PATCH` | `/employees/:id` | Partial employee payload | Updated employee row | `isActive=false` deactivates without deleting |
| `POST` | `/employees/:id/bonuses` | `amount`, `paidAt`, optional `description`, optional `paymentMethod` | Created employee bonus row | Bonus stays scoped to the employee |
| `GET` | `/employees/:id/bonuses?page=&limit=&from=&to=` | Query params only | `{ data, meta }` pagination envelope | Ordered by `paidAt desc` |

## Error contract

| Status | Trigger |
| --- | --- |
| `400` | Empty/invalid strings, invalid enums, invalid pagination bounds, invalid bonus payload |
| `401` | Missing or invalid auth cookie |
| `403` | Authenticated role is not `ADMIN` or `SALES` |
| `404` | Unknown employee id or unknown cost-center reference |

## Example create payload

```json
{
  "name": "Ana Torres",
  "type": "MECHANIC",
  "phone": "3001234567",
  "baseSalaryMonthly": 2500000,
  "costCenterId": "seed-cost-center-general"
}
```

## Example bonus payload

```json
{
  "amount": 180000,
  "description": "Bono trimestral",
  "paidAt": "2026-05-10T09:00:00.000Z",
  "paymentMethod": "TRANSFER"
}
```
