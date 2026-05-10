# Expenses overview

## Answer first

This slice delivers the protected `/expenses` lifecycle for operational overhead with scheduled/paid semantics, optional cost-center references, idempotent seeds, and reviewer artifacts for **ADMIN | SALES** only.

## What reviewers should verify

1. `POST /expenses` accepts scheduled unpaid expenses and paid expenses, but rejects `paymentMethod` without `paidAt`.
2. `GET /expenses`, `GET /expenses/:id`, and `PATCH /expenses/:id` cover list, lookup, and scheduled-to-paid lifecycle updates without a delete route.
3. Unknown `costCenterId` returns `404 Not Found`, while omitting `costCenterId` remains valid.
4. `MECHANIC` receives `403`, unauthenticated requests receive `401`.

## Route family

| Route | Purpose | Roles |
| --- | --- | --- |
| `POST /expenses` | Create a scheduled or paid operational expense | `ADMIN`, `SALES` |
| `GET /expenses` | List expenses with pragmatic filters and pagination | `ADMIN`, `SALES` |
| `GET /expenses/:id` | Fetch one expense | `ADMIN`, `SALES` |
| `PATCH /expenses/:id` | Update scheduling, payment state, notes, and optional cost center | `ADMIN`, `SALES` |

## Explicit non-goals

- No `DELETE /expenses` in v1.
- No payroll, employee bonuses, work-order actual costs, reporting, or AP workflows.
- No inline cost-center mutations from the expenses capability.

## Reviewer shortcut

- API details: `docs/expenses/api-map.md`
- Validation rules: `docs/expenses/validation-rules.md`
- Test + rollback workflow: `docs/expenses/testing.md`
