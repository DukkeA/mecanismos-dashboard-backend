# Cost centers validation rules

## Request rules

- `code` is required, trimmed, string, and cannot be empty.
- `name` is required, trimmed, string, and cannot be empty.
- `isActive` is optional on create/update and optional as boolean query filter on list.
- `page` defaults to `1`, `limit` defaults to `10`, and `limit` max is `100`.

## Canonical uniqueness

- The server normalizes `code` with `trim().toUpperCase()` before create and update writes.
- Any create/update that matches an existing canonical code fails with `409 Conflict`.
- Duplicate checks are enforced by the application normalization plus the database unique constraint on `code`.

## Examples that collide

- `GENERAL`
- `general`
- ` general `
- `GeNeRaL`

All variants above normalize to the same canonical code, so only one may exist.
