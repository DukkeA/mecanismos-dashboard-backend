# Delta for auth-session

## MODIFIED Requirements

### Requirement: Protected identity and role-scoped access

The system SHALL provide a protected `me` capability that returns the authenticated user identity and role. The system SHALL support route-level role enforcement so each protected endpoint can declare its allowed roles. Customer-assets endpoints SHALL allow `ADMIN` and `SALES` and SHALL reject authenticated `MECHANIC` users. Existing admin-only endpoints SHALL continue allowing only `ADMIN`, so customer-assets access SHALL NOT expand metric-sensitive or other admin-only capabilities.

(Previously: protected flows focused on `ADMIN` and admin-protected access rejected all non-admin roles.)

#### Scenario: Read current user
- GIVEN a valid authenticated request
- WHEN the client requests `me`
- THEN the system returns the authenticated user identity and role

#### Scenario: Customer-assets role enforcement
- GIVEN an authenticated user with role `SALES` or `MECHANIC`
- WHEN the user requests a customer-assets endpoint
- THEN `SALES` is allowed and `MECHANIC` is rejected as forbidden

#### Scenario: Existing admin-only route enforcement
- GIVEN an authenticated user with role `SALES` or `MECHANIC`
- WHEN the user requests an admin-only endpoint
- THEN the system rejects the request as forbidden
