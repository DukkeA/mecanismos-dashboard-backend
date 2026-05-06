# Services overview

## Answer first

This slice delivers the first protected `/services` catalog over `ServiceCatalog` with canonical duplicate prevention, reusable reviewer artifacts, and role-based access for **ADMIN | SALES** only.

## What reviewers should verify

1. `POST /services` derives `slug` from `name` and rejects canonical duplicates with `409 Conflict`.
2. `GET /services` filters by `page`, `limit`, optional `search`, and optional `isActive`.
3. `GET /services/:id` and `PATCH /services/:id` return `404` for unknown ids.
4. `MECHANIC` receives `403`, unauthenticated requests receive `401`.

## Route family

| Route | Purpose | Roles |
| --- | --- | --- |
| `POST /services` | Create reusable service catalog entry | `ADMIN`, `SALES` |
| `GET /services` | List services for combobox and admin flows | `ADMIN`, `SALES` |
| `GET /services/:id` | Fetch one service | `ADMIN`, `SALES` |
| `PATCH /services/:id` | Update service and regenerate canonical slug | `ADMIN`, `SALES` |

## Explicit non-goals

- No `DELETE /services` in v1.
- No client-provided slug in v1.
- No `MECHANIC` access.

## Reviewer shortcut

- API details: `docs/services/api-map.md`
- Validation rules: `docs/services/validation-rules.md`
- Test + rollback workflow: `docs/services/testing.md`
