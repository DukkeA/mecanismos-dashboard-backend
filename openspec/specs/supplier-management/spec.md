# Supplier Management Specification

## Purpose

Define the v1 protected supplier slice for create, list, get, and update with pragmatic identity capture, normalized multi-phone support, migration safety, and reviewer artifacts.

## Requirements

### Requirement: Supplier lifecycle API

The system SHALL allow `ADMIN` and `SALES` to create, list, get, and update suppliers. A supplier SHALL have `type`=`PERSON | COMPANY`, required `name`, optional legal document fields, optional `email`, optional `contactName`, optional `notes`, and `isActive`. Supplier `name` SHALL NOT be globally unique in v1. List SHOULD support pragmatic `page`, `limit`, optional `isActive`, and simple `search` over `name`, `email`, `contactName`, `documentNumber`, and phone values. The system SHALL return `404 Not Found` for missing suppliers and SHALL NOT expose delete.

#### Scenario: Create supplier with pragmatic identity data
- GIVEN an authenticated allowed user submits valid supplier data
- WHEN the payload includes required `name`, valid `type`, and at least one phone
- THEN the system creates the supplier without requiring legal document fields

#### Scenario: Duplicate supplier names are allowed
- GIVEN an existing supplier named `Repuestos Central`
- WHEN an authenticated allowed user creates another supplier with the same `name`
- THEN the system accepts the request if the rest of the payload is valid

#### Scenario: List suppliers with pragmatic filters
- GIVEN authenticated access and stored suppliers
- WHEN the client requests list with optional `search` and `isActive`
- THEN the system returns suppliers filtered by those values without requiring full-text behavior

### Requirement: Supplier phone contract

The system SHALL persist supplier phones in child rows. Create SHALL require at least one phone entry. Each phone entry SHALL include `phone`, MAY include `label` and `notes`, and SHALL support `hasWhatsapp` plus `isPrimary`. When a supplier has phones, the system SHALL persist exactly one primary phone. If create marks none as primary, the first phone SHALL become primary. Update SHALL preserve exactly one primary phone after the write.

#### Scenario: First phone becomes primary by default
- GIVEN an authenticated allowed user submits supplier phones with no `isPrimary=true`
- WHEN the supplier is created
- THEN the system persists the first phone as the single primary phone

#### Scenario: Update keeps exactly one primary phone
- GIVEN an existing supplier with phones
- WHEN an authenticated allowed user updates the phone collection
- THEN the persisted result contains exactly one primary phone

#### Scenario: Create without phones is rejected
- GIVEN an authenticated allowed user submits supplier data without phones
- WHEN the create request is validated
- THEN the system rejects the request with a client validation error

### Requirement: Protected access

All supplier endpoints SHALL require an authenticated session. `ADMIN` and `SALES` SHALL be allowed. Authenticated `MECHANIC` users SHALL receive `403 Forbidden`, and unauthenticated requests SHALL receive `401 Unauthorized`.

#### Scenario: Mechanic is forbidden
- GIVEN an authenticated `MECHANIC` user
- WHEN that user calls any supplier endpoint
- THEN the system rejects the request with `403 Forbidden`

### Requirement: Migration and backfill safety

The supplier reshape SHALL preserve existing supplier IDs and existing foreign-key relationships. Migration SHALL backfill legacy `Supplier.phone` values into `SupplierPhone` rows before obsolete flat-phone assumptions are removed. Existing supplier rows without legacy phone data MAY remain without child phones after migration.

#### Scenario: Legacy phone survives backfill
- GIVEN an existing supplier row with a legacy flat phone value
- WHEN the migration runs
- THEN the supplier keeps the same ID and relations
- AND the legacy phone is represented as a child supplier-phone row

### Requirement: Supplier quote lookup parent

The system SHALL let `ADMIN` and `SALES` view quote history from supplier context without changing supplier create, list, get, update, phone, migration, or phone-backfill behavior. Supplier quote lookup SHALL return that supplier's quote events, support pragmatic item/status/date filtering, preserve voided-history visibility, and return `404 Not Found` when the supplier does not exist.

#### Scenario: View supplier quote timeline
- GIVEN an existing supplier with quote events
- WHEN an allowed user requests supplier quote lookup
- THEN the system returns that supplier's quote history and filters without altering supplier lifecycle rules

### Requirement: Reviewer docs, Postman, and automated verification

Delivery SHALL include Swagger coverage, reviewer docs under `docs/suppliers/`, an importable Postman collection for implemented supplier routes, and automated verification. Tests SHALL cover create/list/get/update behavior, phone-primary rules, `ADMIN | SALES` access, `MECHANIC` rejection, and migration/backfill expectations.

#### Scenario: Reviewer artifacts are available
- GIVEN the supplier slice is completed
- WHEN reviewers inspect docs, Postman, and automated tests
- THEN they find executable and written guidance for the implemented supplier behavior
