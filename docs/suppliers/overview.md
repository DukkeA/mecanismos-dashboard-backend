# Suppliers overview

## Answer first

This slice closes supplier-management review with protected `create/list/get/update` supplier flows, reviewer docs, E2E coverage, and a runner-ready Postman collection. Every supplier route requires auth cookies, allows **ADMIN | SALES**, blocks `MECHANIC`, and keeps duplicate supplier names intentionally valid in v1.

## What reviewers should verify

1. Suppliers accept **multiple phones** and always persist **exactly one primary phone**.
2. `hasWhatsapp` survives create and update responses.
3. Duplicate supplier names are accepted when the rest of the payload is valid.
4. `401`, `403`, `400`, and `404` contracts behave exactly as documented.

## Route family

| Route | Purpose | Roles |
| --- | --- | --- |
| `POST /suppliers` | Create supplier with one or more phones | `ADMIN`, `SALES` |
| `GET /suppliers` | List suppliers with pragmatic filters | `ADMIN`, `SALES` |
| `GET /suppliers/:id` | Fetch one supplier | `ADMIN`, `SALES` |
| `PATCH /suppliers/:id` | Update supplier and optionally replace phones | `ADMIN`, `SALES` |

## Explicit non-goals

- No `DELETE /suppliers`.
- No document uniqueness enforcement in v1.
- No `MECHANIC` access.
- No supplier-phone partial endpoint; phone updates stay full-replacement on `PATCH`.

## Reviewer shortcut

- API details: `docs/suppliers/api-map.md`
- Validation rules: `docs/suppliers/validation-rules.md`
- Test + Postman workflow: `docs/suppliers/testing.md`
