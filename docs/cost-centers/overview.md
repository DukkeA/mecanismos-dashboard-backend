# Cost centers overview

## Answer first

This slice delivers the protected `/cost-centers` catalog with canonical `code` normalization, active/inactive lifecycle control, idempotent seed defaults, and role-based access for **ADMIN | SALES** only.

## What reviewers should verify

1. `POST /cost-centers` stores `code` as `trim().toUpperCase()` and rejects canonical duplicates with `409 Conflict`.
2. `GET /cost-centers` filters by `page`, `limit`, optional `search`, and optional `isActive`.
3. `GET /cost-centers/:id` and `PATCH /cost-centers/:id` return `404` for unknown ids.
4. `GENERAL`, `BODEGA`, and `OFICINA` exist after reseeding without duplicate rows.
5. `MECHANIC` receives `403`, unauthenticated requests receive `401`.

## Route family

| Route | Purpose | Roles |
| --- | --- | --- |
| `POST /cost-centers` | Create reusable classifier entry | `ADMIN`, `SALES` |
| `GET /cost-centers` | List cost centers for catalog and selector flows | `ADMIN`, `SALES` |
| `GET /cost-centers/:id` | Fetch one cost center | `ADMIN`, `SALES` |
| `PATCH /cost-centers/:id` | Rename, recode, or activate/deactivate one cost center | `ADMIN`, `SALES` |

## Explicit non-goals

- No `DELETE /cost-centers` in v1.
- No employee or expense flow changes in this slice.
- No direct reviewer dependency on generated Prisma files.

## Reviewer shortcut

- API details: `docs/cost-centers/api-map.md`
- Validation rules: `docs/cost-centers/validation-rules.md`
- Test + rollback workflow: `docs/cost-centers/testing.md`
