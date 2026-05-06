# Suppliers API map

## Summary table

| Method | Path | Purpose | Roles |
| --- | --- | --- | --- |
| POST | `/suppliers` | Create supplier | `ADMIN`, `SALES` |
| GET | `/suppliers` | List suppliers | `ADMIN`, `SALES` |
| GET | `/suppliers/:id` | Fetch supplier | `ADMIN`, `SALES` |
| PATCH | `/suppliers/:id` | Update supplier | `ADMIN`, `SALES` |

## Query map

- `GET /suppliers?page=1&limit=10&search=repuestos`
- `GET /suppliers?page=1&limit=10&type=COMPANY&isActive=true`
- `GET /suppliers?page=1&limit=10&search=3001234567`

## Update semantics

| Route | Mutable fields | Guardrails |
| --- | --- | --- |
| `PATCH /suppliers/:id` | `name`, `type`, `contactName`, `documentType`, `documentNumber`, `email`, `notes`, `isActive`, `phones` | If `phones` is omitted, keep current phones. If `phones` is present, replace the full collection and persist exactly one primary phone. |

## Reviewer callouts

- Search is pragmatic, not full-text: it scans `name`, `email`, `contactName`, `documentNumber`, and phone values.
- `PATCH /suppliers/:id` is the only place where phone replacement semantics matter.
- `POST /suppliers` and `PATCH /suppliers/:id` both normalize blank-primary payloads into a single primary phone.
- There is intentionally **no** delete surface.
