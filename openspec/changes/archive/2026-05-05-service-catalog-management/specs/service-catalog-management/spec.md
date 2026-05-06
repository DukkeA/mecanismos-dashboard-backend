# Service Catalog Management Specification

## Purpose

Define the v1 protected `/services` catalog for reusable business service entries with canonical duplicate prevention, pragmatic lookup filters, migration safety, and reviewer artifacts.

## Requirements

### Requirement: Service catalog lifecycle API

The system SHALL allow `ADMIN` and `SALES` to create, list, get, and update service-catalog entries through `/services`. Create and update SHALL require `name` as a trimmed, non-empty string. `description` MAY be omitted. `isActive` SHALL be supported. List SHOULD support `page`, `limit`, optional `search`, and optional `isActive`. Search SHOULD remain pragmatic and MAY match `name`, `slug`, and `description`. Get by unknown id SHALL return `404 Not Found`. Delete SHALL NOT be exposed in v1.

#### Scenario: Create service with optional fields
- GIVEN an authenticated allowed user submits valid service data
- WHEN the payload contains a non-empty trimmed `name`
- THEN the system creates the service and persists `description` only when provided

#### Scenario: List services for combobox reuse
- GIVEN authenticated access and stored services
- WHEN the client requests `/services` with `page`, `limit`, optional `search`, and optional `isActive`
- THEN the system returns paginated catalog results filtered by those values

#### Scenario: Missing service id
- GIVEN an authenticated allowed user
- WHEN the user requests a non-existent service id
- THEN the system rejects the request with `404 Not Found`

### Requirement: Canonical slug uniqueness

Each service SHALL have a canonical unique `slug` derived from `name` in v1. Clients SHALL NOT be required to provide `slug`. Normalization SHALL remove accents, lowercase text, collapse whitespace and punctuation into single hyphens, and trim surrounding hyphens. Create or rename requests whose canonical slug matches an existing service SHALL be rejected with `409 Conflict`, even when display names differ only by accents, case, or separators.

#### Scenario: Accent and case variants collide
- GIVEN an existing service named `Diagnóstico`
- WHEN an authenticated allowed user creates or renames another service as `diagnostico` or `DIAGNOSTICO`
- THEN the system rejects the request with `409 Conflict`

#### Scenario: Update regenerates canonical slug
- GIVEN an existing service and another stored service with a conflicting canonical name
- WHEN an authenticated allowed user renames the first service into that conflicting canonical form
- THEN the system rejects the update with `409 Conflict`

### Requirement: Protected role access

All `/services` endpoints SHALL require an authenticated session. `ADMIN` and `SALES` SHALL be allowed. Authenticated `MECHANIC` users SHALL receive `403 Forbidden`, and unauthenticated requests SHALL receive `401 Unauthorized`.

#### Scenario: Mechanic is forbidden
- GIVEN an authenticated `MECHANIC` user
- WHEN that user calls any `/services` endpoint
- THEN the system rejects the request with `403 Forbidden`

### Requirement: Development migration baseline safety

The service-catalog schema change SHALL keep `ServiceCatalog.slug @unique` as the database-enforced uniqueness key while leaving canonical slug semantics owned by the application `slugify()` helper. Because this project is operating on a development database baseline with no real production data, the migration MAY rely on reset/dev workflow instead of duplicating slug normalization or collision resolution logic in SQL.

#### Scenario: Reset-friendly migration stays structural
- GIVEN a developer applies the service-catalog migration on the dev baseline
- WHEN Prisma replays the migration set from a clean database or after a dev reset
- THEN the schema adds `slug`, drops `name` uniqueness, and creates the `slug`, `name`, and `isActive` indexes without introducing a second SQL slug-normalization source of truth

### Requirement: Seeds and reviewer verification

Delivery SHALL include representative idempotent service seeds, reviewer-facing docs, a runner-ready Postman collection that uses real created/listed ids instead of fake placeholders, and automated tests. Verification SHALL cover create, list, get, update, canonical collision handling, empty-slug rejection, allowed roles, forbidden `MECHANIC` access, and the reset/dev-oriented migration baseline expectations.

#### Scenario: Reviewer artifacts are executable
- GIVEN the service-catalog slice is completed
- WHEN reviewers inspect seeds, docs, Postman, and automated tests
- THEN they can exercise implemented `/services` behavior without inventing ids or setup data
