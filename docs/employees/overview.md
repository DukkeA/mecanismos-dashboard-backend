# Employees overview

## Answer first

This slice delivers the protected `/employees` catalog with employee lifecycle updates, optional cost-center references, employee-owned manual bonuses, and reviewer artifacts for **ADMIN | SALES** only.

## What reviewers should verify

1. `POST /employees` creates active employees by default and rejects unknown `costCenterId` with `404 Not Found`.
2. `GET /employees`, `GET /employees/:id`, and `PATCH /employees/:id` cover listing, lookup, and inactive lifecycle toggles without a delete route.
3. `POST /employees/:id/bonuses` and `GET /employees/:id/bonuses` stay employee-owned and reject missing employees with `404 Not Found`.
4. `MECHANIC` receives `403`, unauthenticated requests receive `401`.

## Route family

| Route | Purpose | Roles |
| --- | --- | --- |
| `POST /employees` | Create employee with optional cost-center ownership reference | `ADMIN`, `SALES` |
| `GET /employees` | List employees with pragmatic filters | `ADMIN`, `SALES` |
| `GET /employees/cost-center-options` | Read-only cost-center options for forms | `ADMIN`, `SALES` |
| `GET /employees/:id` | Fetch one employee | `ADMIN`, `SALES` |
| `PATCH /employees/:id` | Update employee fields and `isActive` | `ADMIN`, `SALES` |
| `POST /employees/:id/bonuses` | Create manual employee bonus | `ADMIN`, `SALES` |
| `GET /employees/:id/bonuses` | List employee bonuses | `ADMIN`, `SALES` |

## Explicit non-goals

- No `DELETE /employees` in v1.
- No cost-center mutation from the employees capability.
- No payroll projection, work-order analytics, expenses, or reporting flows.

## Reviewer shortcut

- API details: `docs/employees/api-map.md`
- Validation rules: `docs/employees/validation-rules.md`
- Test + rollback workflow: `docs/employees/testing.md`
