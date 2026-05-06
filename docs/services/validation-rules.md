# Services validation rules

## Request rules

- `name` is required, trimmed, string, and cannot be empty.
- `description` is optional and trimmed when present.
- `isActive` is optional on create/update and optional as boolean query filter on list.
- `page` defaults to `1`, `limit` defaults to `10`, and `limit` max is `100`.

## Canonical uniqueness

- The server derives a **canonical slug** from `name`.
- Normalization removes accents, lowercases text, collapses repeated spaces or punctuation, and trims surrounding hyphens.
- Any create/update that matches an existing canonical slug fails with `409 Conflict`.

## Examples that collide

- `Diagnóstico`
- `diagnostico`
- `DIAGNOSTICO`
- `diagnóstico---`

All variants above normalize to the same canonical slug, so only one may exist.
