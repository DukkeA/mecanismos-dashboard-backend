# Suppliers validation rules

## Core rules

1. Supplier `name` is required.
2. Supplier `type` must be `PERSON` or `COMPANY`.
3. Create requires at least one phone.
4. Persisted phones must end with **exactly one primary phone**.
5. duplicate supplier names are allowed in v1.

## Phone normalization rules

- Trim all phone labels and numbers. Supplier and phone `notes` are optional nullable LexKit/Lexical editor-state JSON; plain strings are rejected.
- Lowercase supplier email.
- If create/update sends no primary phone, the **first phone becomes primary**.
- If create/update sends more than one primary phone, the request fails.
- `hasWhatsapp` defaults to `false` when omitted.

## Error contract

| Situation | Status |
| --- | --- |
| Missing auth cookie | `401 Unauthorized` |
| Authenticated `MECHANIC` request | `403 Forbidden` |
| Blank `name`, invalid enum, or empty `phones` | `400 Bad Request` |
| Supplier not found | `404 Not Found` |

## Scope guardrails

- `ADMIN | SALES` only.
- No delete endpoints.
- No document uniqueness conflict in this slice.
- No partial phone endpoint outside supplier `PATCH`.
