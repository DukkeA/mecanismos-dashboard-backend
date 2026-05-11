# Employee monthly payroll API map

## Routes

- `GET /employee-monthly-payroll?page=&limit=&year=&status=`
- `GET /employee-monthly-payroll/:id`
- `POST /employee-monthly-payroll/generate`
- `POST /employee-monthly-payroll/:id/finalize`

## Authorization

- `ADMIN | SALES` can list and inspect periods.
- Only `ADMIN` can generate drafts or finalize a period.

## Payloads

`POST /employee-monthly-payroll/generate`

```json
{
  "year": 2026,
  "month": 5
}
```
