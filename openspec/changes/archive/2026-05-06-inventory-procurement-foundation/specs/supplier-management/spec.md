# Delta for Supplier Management

## ADDED Requirements

### Requirement: Supplier quote lookup parent

The system SHALL let `ADMIN` and `SALES` view quote history from supplier context without changing supplier create, list, get, update, phone, or migration behavior. Supplier quote lookup SHALL return that supplier's quote events, support pragmatic item/status/date filtering, preserve voided-history visibility, and return `404 Not Found` when the supplier does not exist.

#### Scenario: View supplier quote timeline
- GIVEN an existing supplier with quote events
- WHEN an allowed user requests supplier quote lookup
- THEN the system returns that supplier's quote history and filters without altering supplier lifecycle rules
