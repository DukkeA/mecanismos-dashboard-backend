# Cost Centers Management Specification

## Purpose

Define the v1 protected cost-center catalog so admins can manage reusable area classifiers with normalized codes, active/inactive lifecycle control, idempotent seed defaults, and no delete behavior.

## Requirements

### Requirement: Cost-center lifecycle API

The system SHALL allow authenticated authorized users to create, list, get, and update cost centers through a dedicated catalog API. A cost center SHALL have required `code`, required `name`, and `isActive`. Create and update SHALL require trimmed non-empty values for `code` and `name`. List SHOULD support pragmatic filtering by optional `search` and optional `isActive`. Requests for an unknown cost-center id SHALL return `404 Not Found`. Delete SHALL NOT be exposed in v1.

#### Scenario: Create a cost center
- GIVEN an authenticated authorized user submits valid `code` and `name`
- WHEN the create request passes validation
- THEN the system creates the cost center with an `isActive` state available for later lifecycle changes

#### Scenario: Missing cost center id
- GIVEN an authenticated authorized user
- WHEN the user requests a non-existent cost-center id
- THEN the system rejects the request with `404 Not Found`

### Requirement: Canonical code normalization and uniqueness

Each cost center SHALL have a canonical unique `code` in v1. The system SHALL normalize `code` by trimming surrounding whitespace and converting letters to uppercase before persistence and duplicate checks. Create or update requests whose canonical code matches an existing cost center SHALL be rejected with `409 Conflict`, even when the submitted value differs only by casing or surrounding spaces.

#### Scenario: Variant code collides
- GIVEN an existing cost center with code `GENERAL`
- WHEN an authenticated authorized user creates or updates another cost center with ` general `
- THEN the system rejects the request with `409 Conflict`

#### Scenario: Stored code is canonicalized
- GIVEN an authenticated authorized user submits code ` bodega `
- WHEN the cost center is created or updated successfully
- THEN the persisted code is `BODEGA`

### Requirement: Active and inactive lifecycle control

The system SHALL support active/inactive lifecycle management without deletion. Create SHOULD default new cost centers to active unless the request explicitly sets otherwise. Update SHALL allow changing `name` and `isActive`. Deactivating a cost center SHALL preserve the record for future historical relationships instead of removing it.

#### Scenario: Deactivate a cost center
- GIVEN an existing active cost center
- WHEN an authenticated authorized user updates `isActive` to `false`
- THEN the system persists the record as inactive without deleting it

### Requirement: Protected access, seeds, and reviewer verification

All cost-center endpoints SHALL require an authenticated session. Only the project's allowed catalog-management roles SHALL be authorized; authenticated disallowed roles SHALL receive `403 Forbidden`, and unauthenticated requests SHALL receive `401 Unauthorized`. Delivery SHALL include idempotent default seeds for `GENERAL`, `BODEGA`, and `OFICINA`, plus reviewer-facing docs, executable API artifacts, and automated verification for lifecycle, normalization, duplicate rejection, and protected access.

#### Scenario: Unauthorized access is blocked
- GIVEN an unauthenticated or authenticated disallowed user
- WHEN that user calls a cost-center endpoint
- THEN the system rejects the request with `401 Unauthorized` or `403 Forbidden` respectively

#### Scenario: Default seeds are idempotent
- GIVEN the seed routine runs more than once
- WHEN default cost centers are applied
- THEN `GENERAL`, `BODEGA`, and `OFICINA` exist without duplicate rows
