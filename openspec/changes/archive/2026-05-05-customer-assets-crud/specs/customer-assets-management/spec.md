# Customer Assets Management Specification

## Purpose

Protected v1 CRUD-lite for customers, vehicles, and customer-owned components with ownership-safe rules and reviewer artifacts.

## Requirements

### Requirement: Customer lifecycle

The system SHALL allow `ADMIN` and `SALES` to create, list, get, and update customers. Customer create/update SHALL accept `notes` as an optional rich-text string stored as a plain string in v1. Customer list SHOULD support `page`, `limit`, and simple `search` over name, document number, and phone. The system SHALL reject duplicate `(documentType, documentNumber)` with `409 Conflict` and SHALL NOT expose delete.

#### Scenario: Create customer with optional notes
- GIVEN an authenticated `ADMIN` or `SALES` user submits valid customer data
- WHEN the request includes or omits `notes`
- THEN the system creates the customer and persists `notes` only when provided

#### Scenario: Duplicate customer document
- GIVEN an existing customer with the same document type and number
- WHEN an authenticated allowed user creates another customer with that pair
- THEN the system rejects the request with `409 Conflict`

#### Scenario: Customer list stays pragmatic
- GIVEN authenticated access and existing customers
- WHEN the client requests a page with optional search text
- THEN the system returns paginated results without requiring full-text search behavior

### Requirement: Vehicle lifecycle

The system SHALL allow `ADMIN` and `SALES` to create, list, get, and update vehicles. Vehicle create SHALL require an existing customer. Vehicle update SHALL NOT allow `customerId` reassignment. Vehicle list SHOULD support `page`, `limit`, optional `customerId`, and simple search over plate, brand, and model reference. The system SHALL reject duplicate `plate` with `409 Conflict`, missing parent with `404 Not Found`, and SHALL NOT expose delete.

#### Scenario: Create vehicle for existing customer
- GIVEN an authenticated allowed user and an existing customer
- WHEN the user submits valid vehicle data
- THEN the system creates the vehicle linked to that customer

#### Scenario: Vehicle parent is missing
- GIVEN an authenticated allowed user
- WHEN the user creates a vehicle for a non-existent customer
- THEN the system rejects the request with `404 Not Found`

#### Scenario: Vehicle reassignment is forbidden
- GIVEN an existing vehicle already linked to a customer
- WHEN an authenticated allowed user updates the vehicle with another `customerId`
- THEN the system rejects the request and keeps ownership unchanged

### Requirement: Component lifecycle

The system SHALL allow `ADMIN` and `SALES` to create, list, get, and update customer-owned components. Component create/update SHALL require an existing customer. If `vehicleId` is provided, the referenced vehicle SHALL exist and SHALL belong to the same customer. Component update SHALL NOT allow `customerId` reassignment. Component list SHOULD support `page`, `limit`, optional `customerId`/`vehicleId`, and simple search over identifier, reference, and brand. Missing parent or record SHALL return `404 Not Found`, cross-customer mismatch SHALL return `400 Bad Request`, and delete SHALL NOT be exposed.

#### Scenario: Create component with matching vehicle
- GIVEN an authenticated allowed user, an existing customer, and that customer's vehicle
- WHEN the user submits valid component data with that `vehicleId`
- THEN the system creates the component linked to the same customer and vehicle

#### Scenario: Cross-customer vehicle mismatch
- GIVEN an authenticated allowed user and a vehicle owned by another customer
- WHEN the user creates or updates a component with mismatched `customerId` and `vehicleId`
- THEN the system rejects the request with `400 Bad Request`

#### Scenario: Component ownership cannot be reassigned
- GIVEN an existing component already linked to a customer
- WHEN an authenticated allowed user updates the component with another `customerId`
- THEN the system rejects the request and preserves original ownership

### Requirement: Protection, docs, and strict TDD

All customer-assets endpoints SHALL require an authenticated session. Authenticated roles outside `ADMIN | SALES` SHALL receive `403 Forbidden`. Delivery SHALL include Swagger documentation, reviewer docs under `docs/customer-assets/`, an importable Postman collection, and strict TDD with unit, e2e, and artifact tests as the primary verification. `SALES` access SHALL stay limited to customer-assets create/read/update behavior and SHALL NOT widen admin-only metric or profitability capabilities.

#### Scenario: Unauthenticated request is rejected
- GIVEN no valid authenticated session
- WHEN the client calls any customer-assets endpoint
- THEN the system rejects the request with `401 Unauthorized`

#### Scenario: Out-of-scope role is forbidden
- GIVEN an authenticated `MECHANIC` user
- WHEN that user calls any customer-assets endpoint
- THEN the system rejects the request with `403 Forbidden`

#### Scenario: Reviewer artifacts are delivered
- GIVEN the feature is completed
- WHEN reviewers inspect docs, Postman, and automated tests
- THEN they find customer-assets guidance and executable coverage for create, list, get, and update flows
