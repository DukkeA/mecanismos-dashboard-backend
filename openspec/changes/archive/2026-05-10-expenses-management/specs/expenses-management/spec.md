# Expenses Management Specification

## Purpose

Define the v1 protected operational-expense capability so admins can create, list, get, and update overhead expenses with optional cost-center classification, explicit scheduled/paid semantics, and reviewer-ready fixtures without expanding into payroll, work-order costs, reporting, or accounts-payable workflows.

## Requirements

### Requirement: Expense lifecycle API

The system SHALL allow authenticated authorized users to create, list, get, and update operational expenses through a dedicated capability. An expense SHALL have required `name`, required `category`, required `amount`, required `expectedAt`, optional `costCenterId`, optional `paidAt`, optional `paymentMethod`, and optional `notes`. `category` SHALL remain limited to the existing `ExpenseCategory` enum in v1. List SHOULD support pragmatic `page`, `limit`, optional `category`, optional `costCenterId`, optional paid-state filtering, and simple text search. Unknown expense ids SHALL return `404 Not Found`. Delete SHALL NOT be exposed in v1.

#### Scenario: Create an operational expense
- GIVEN an authenticated authorized user submits valid expense data
- WHEN the create request passes validation
- THEN the system creates the expense for later scheduling or payment tracking

#### Scenario: Missing expense id
- GIVEN an authenticated authorized user
- WHEN the user requests a non-existent expense id
- THEN the system rejects the request with `404 Not Found`

### Requirement: Optional cost-center reference validation

Expenses MAY reference a cost center, but this capability SHALL only consume the existing cost-center catalog. Create and update requests that omit `costCenterId` SHALL remain valid. Create and update requests that include `costCenterId` SHALL require the referenced cost center to exist; unknown references SHALL be rejected with `404 Not Found`. This capability SHALL NOT create, update, or delete cost centers inline.

#### Scenario: Create expense without cost center
- GIVEN an authenticated authorized user submits valid expense data without `costCenterId`
- WHEN the request is processed
- THEN the system creates the expense without a cost-center association

#### Scenario: Reject unknown cost center reference
- GIVEN an authenticated authorized user submits `costCenterId` for a non-existent cost center
- WHEN the expense create or update request is validated
- THEN the system rejects the request with `404 Not Found`

### Requirement: Scheduled and paid expense semantics

The system SHALL treat `expectedAt` as the scheduled date for the expense and SHALL derive paid state from whether `paidAt` is present. Unpaid expenses SHALL be allowed with `paidAt` unset. `paymentMethod` MAY be stored only when `paidAt` is present; requests that send `paymentMethod` without `paidAt` SHALL be rejected with `400 Bad Request`. Update SHALL allow moving an expense between scheduled and paid states without introducing invoice, accounts-payable, or payroll workflow semantics.

#### Scenario: Record a scheduled unpaid expense
- GIVEN an authenticated authorized user submits valid expense data with `expectedAt` and no `paidAt`
- WHEN the expense is created
- THEN the system stores the expense as scheduled and unpaid

#### Scenario: Reject payment method on unpaid expense
- GIVEN an authenticated authorized user submits expense data with `paymentMethod` and no `paidAt`
- WHEN the request is validated
- THEN the system rejects the request with `400 Bad Request`

### Requirement: Protected access, seeds, and reviewer artifacts

All expense endpoints SHALL require an authenticated session. Only the project's allowed expense-management roles SHALL be authorized; authenticated disallowed roles SHALL receive `403 Forbidden`, and unauthenticated requests SHALL receive `401 Unauthorized`. Delivery SHALL include idempotent expense seeds covering paid and unpaid examples, with and without `costCenterId`, plus reviewer-facing docs and executable artifacts that verify protected access, lifecycle behavior, cost-center validation, and scheduled/paid semantics.

#### Scenario: Unauthorized access is blocked
- GIVEN an unauthenticated or authenticated disallowed user
- WHEN that user calls an expense endpoint
- THEN the system rejects the request with `401 Unauthorized` or `403 Forbidden` respectively

#### Scenario: Expense seeds are idempotent
- GIVEN the seed routine runs more than once
- WHEN default expense fixtures are applied
- THEN representative paid and unpaid expenses exist without duplicate rows
