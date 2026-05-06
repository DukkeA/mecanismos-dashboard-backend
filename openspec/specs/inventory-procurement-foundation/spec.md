# Inventory Procurement Foundation Specification

## Purpose

Define the v1 protected inventory and procurement slice for item catalog, physical stock ledger, supplier quote history, lookup workflow, and reviewer artifacts without introducing work-order costing behavior.

## Requirements

### Requirement: Inventory item catalog and derived stock

The system SHALL allow `ADMIN` and `SALES` to create, list, and get inventory items. Items MUST support owned-stock and demand-purchased entries, MAY have zero stock, and MUST expose derived `currentStock` in list/get responses. List/search SHALL support `isActive`, `itemType`, `condition`, and pragmatic search over `name`, `brand`, `reference`, and `identifier`. Items without movements SHALL report `currentStock=0`. Current stock SHALL NOT be manually edited.

#### Scenario: Search active items with derived stock
- GIVEN stored items and movement history
- WHEN an allowed user lists items with filters or search
- THEN each returned row includes derived `currentStock` and matching item fields

#### Scenario: Item without movements starts at zero
- GIVEN an active item with no ledger rows
- WHEN an allowed user requests the item or list
- THEN the system returns `currentStock=0`

### Requirement: Inventory movement ledger invariants

The system SHALL allow movement create, list, and get for physical owned stock only. Each movement MUST reference an inventory item, movement type, quantity, and occurred-at timestamp, and MAY reference supplier or work order as context. The system MUST derive stock from ordered movements, MUST reject any write that would make stock negative by default, and SHALL NOT expose destructive edit or delete behavior for persisted movements.

#### Scenario: Reject outbound movement below available stock
- GIVEN an item whose derived stock is 2
- WHEN an allowed user records an outbound quantity of 3
- THEN the system rejects the write with a client error and preserves the ledger

### Requirement: Supplier quote event lifecycle

The system SHALL record supplier quotes as append-only events linked to supplier and item. A new market price MUST create a new quote row. Update MAY be used only for controlled typo or metadata correction, and voiding MUST preserve the row while marking it unusable for default latest-price summaries. Quote history SHALL remain searchable by item, supplier, status, and date-oriented lookup.

#### Scenario: New supplier price appends history
- GIVEN an existing quote for the same supplier and item
- WHEN an allowed user records a different quoted cost
- THEN the system creates a new quote event instead of overwriting prior history

#### Scenario: Voided quote stays auditable
- GIVEN a persisted quote entered in error
- WHEN an allowed user voids it
- THEN the quote remains visible in history and is excluded from default valid-price summaries

### Requirement: Quote lookup workflow

The system SHALL help users decide whom to call first by exposing item-centric quote lookup and supplier-centric quote lookup. Item quote lookup MUST summarize the latest valid quote per supplier and retain full chronological history. Supplier quote lookup MUST show that supplier's quote timeline for the requested item set or supplier context.

#### Scenario: Compare suppliers from one item
- GIVEN multiple suppliers have valid quote events for an item
- WHEN an allowed user opens that item's quote lookup
- THEN the system shows latest valid quote per supplier with historical drill-down

### Requirement: Protected access and reviewer deliverables

All inventory-item, movement, and supplier-quote endpoints SHALL require authentication. `ADMIN` and `SALES` SHALL be allowed; authenticated `MECHANIC` users SHALL receive `403 Forbidden`; unauthenticated requests SHALL receive `401 Unauthorized`. Delivery SHALL include congruent Prisma schema/index coverage for item, movement, and quote lookups, idempotent seed data for representative items/movements/quotes, Swagger coverage, reviewer docs, Postman collections, and automated tests.

#### Scenario: Mechanic is forbidden
- GIVEN an authenticated `MECHANIC` user
- WHEN that user calls any inventory or quote endpoint
- THEN the system rejects the request with `403 Forbidden`

### Requirement: Boundaries and future integration

This slice SHALL NOT introduce work-order CRUD, purchase-order flows, reservations/backorders, automatic stock consumption, negative stock by default, or destructive quote-history rewrites. The schema MAY keep optional work-order linkage fields as extension points, but current quote and movement semantics MUST stay valid without redesign when future work-order estimate or actual-cost features reference them.

#### Scenario: Future linkage does not change v1 rules
- GIVEN a quote or movement stores optional work-order context
- WHEN reviewers inspect v1 behavior
- THEN stock remains movement-derived and quote history remains append-only
