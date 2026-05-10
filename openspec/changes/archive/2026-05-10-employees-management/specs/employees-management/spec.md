# Employees Management Specification

## Purpose

Define the v1 protected employee catalog so admins can manage business employees, active/inactive lifecycle, optional cost-center association, and employee-owned manual bonuses without expanding into payroll, expenses, reporting, or work-order analytics.

## Requirements

### Requirement: Employee lifecycle API

The system SHALL allow authenticated authorized users to create, list, get, and update employees. An employee SHALL have required `name`, required `type`, optional `phone`, required `baseSalaryMonthly`, optional `costCenterId`, and `isActive`. List SHOULD support pragmatic `page`, `limit`, optional `isActive`, optional `type`, optional `costCenterId`, and simple `search` over employee identity fields. Unknown employee ids SHALL return `404 Not Found`. Delete SHALL NOT be exposed in v1.

#### Scenario: Create an employee
- GIVEN an authenticated authorized user submits valid employee data
- WHEN the create request passes validation
- THEN the system creates the employee with lifecycle fields available for later updates

#### Scenario: Missing employee id
- GIVEN an authenticated authorized user
- WHEN the user requests a non-existent employee id
- THEN the system rejects the request with `404 Not Found`

### Requirement: Active and inactive employee lifecycle

The system SHALL preserve employee history through lifecycle changes instead of hard deletion. Create SHOULD default new employees to active unless the request explicitly sets otherwise. Update SHALL allow changing `name`, `type`, `phone`, `baseSalaryMonthly`, `costCenterId`, and `isActive`. Deactivating an employee SHALL preserve the employee record and SHALL NOT imply payroll, work-order, or bonus deletion behavior in the API contract.

#### Scenario: Deactivate an employee
- GIVEN an existing active employee
- WHEN an authenticated authorized user updates `isActive` to `false`
- THEN the system persists the employee as inactive without deleting historical ownership

### Requirement: Cost-center reference validation and listing

Employees MAY reference a cost center, but this capability SHALL only consume the existing cost-center catalog. Create and update requests with `costCenterId` SHALL require the referenced cost center to exist; unknown references SHALL be rejected with `404 Not Found`. Employee workflows SHOULD support reviewer-friendly listing of available cost centers as reference data without exposing inline create, update, or delete of cost centers from the employees capability.

#### Scenario: Reject unknown cost center reference
- GIVEN an authenticated authorized user submits `costCenterId` for a non-existent cost center
- WHEN the employee create or update request is validated
- THEN the system rejects the request with `404 Not Found`

#### Scenario: List cost-center reference data
- GIVEN an authenticated authorized user preparing an employee form
- WHEN the user requests available cost-center reference data
- THEN the system returns read-only cost-center options without mutating the cost-center catalog

### Requirement: Employee-owned manual bonuses and reviewer artifacts

The system SHALL allow authenticated authorized users to create and list manual bonus records from employee-owned context. Bonus records SHALL belong to exactly one employee and SHALL support `amount`, optional `description`, required `paidAt`, and optional `paymentMethod`. Bonus flows SHALL reject requests for a non-existent employee with `404 Not Found` and SHALL remain limited to manual sporadic bonuses, not payroll projection or reporting. Delivery SHALL include idempotent employee and bonus seeds plus reviewer-facing docs or executable artifacts that verify protection, lifecycle, ownership, and reference-validation boundaries.

#### Scenario: Create a bonus for an employee
- GIVEN an authenticated authorized user and an existing employee
- WHEN the user submits valid bonus data in that employee's bonus context
- THEN the system creates a bonus owned by that employee

#### Scenario: Missing employee blocks bonus access
- GIVEN an authenticated authorized user
- WHEN the user creates or lists bonuses for a non-existent employee
- THEN the system rejects the request with `404 Not Found`
