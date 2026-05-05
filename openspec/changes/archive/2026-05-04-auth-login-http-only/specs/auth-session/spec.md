# Auth Session Specification

## Purpose

Define the v1 first-party admin authentication contract for email/password login, HttpOnly cookie transport, JWT access, refresh rotation/revocation, role-aware protection, and simple local env usage.

## Non-Goals

- OAuth or social login
- MFA
- Password reset or email verification
- Advanced RBAC beyond role scaffolding for `ADMIN | SALES | MECHANIC`

## Requirements

### Requirement: Email/password login

The system SHALL authenticate only by email and password in v1. On valid credentials for an active user, the system SHALL establish an auth session and return the authenticated user identity with role information. Roles SHALL support `ADMIN`, `SALES`, and `MECHANIC`, while v1 protected flows SHALL focus on `ADMIN`.

#### Scenario: Successful login
- GIVEN an active user with valid email and password
- WHEN the client submits login
- THEN the system authenticates the user and returns the current user payload
- AND the response establishes access and refresh auth cookies

#### Scenario: Invalid login
- GIVEN an unknown email, wrong password, or inactive user
- WHEN the client submits login
- THEN the system rejects the request with an authentication error
- AND no auth cookies are issued

### Requirement: Refresh rotation and reuse handling

The system SHALL use short-lived access tokens and refresh tokens with rotation. Each successful refresh SHALL revoke the presented refresh session and replace it with a new one. Reuse of a previously rotated or revoked refresh token SHALL be rejected and SHALL revoke the affected refresh-session family.

#### Scenario: Successful refresh
- GIVEN a valid non-revoked refresh session
- WHEN the client calls refresh with the current refresh cookie
- THEN the system issues a new access token and a new refresh token
- AND the previously presented refresh session is marked replaced/revoked

#### Scenario: Refresh-token reuse
- GIVEN a refresh token that was already rotated or revoked
- WHEN the client calls refresh with that token
- THEN the system rejects the request
- AND the related refresh-session family is revoked from further use

### Requirement: Logout

The system SHALL allow an authenticated client to terminate its current refresh session. Logout SHALL revoke the current refresh session if present and SHALL clear auth cookies even when the session is already absent or invalid.

#### Scenario: Logout clears session
- GIVEN a client with auth cookies
- WHEN the client calls logout
- THEN the system clears the auth cookies
- AND the current refresh session is no longer usable

### Requirement: Protected identity and admin access

The system SHALL provide a protected `me` capability that returns the authenticated user identity and role. The system SHALL provide admin-protected access that allows `ADMIN` and rejects authenticated non-admin roles.

#### Scenario: Read current user
- GIVEN a valid authenticated request
- WHEN the client requests `me`
- THEN the system returns the authenticated user identity and role

#### Scenario: Admin role enforcement
- GIVEN an authenticated user with role `SALES` or `MECHANIC`
- WHEN the user requests an admin-protected endpoint
- THEN the system rejects the request as forbidden

### Requirement: Cookie security contract

Auth cookies SHALL be `HttpOnly`. Production deployments SHALL use `Secure=true`. Local non-HTTPS development MAY use `Secure=false`. Cookie policy SHALL be configurable for same-site-subdomain and cross-site deployments, and refresh-cookie scope SHALL be narrower than general application traffic.

#### Scenario: Production cookie attributes
- GIVEN production cookie configuration
- WHEN login or refresh succeeds
- THEN auth cookies are issued as `HttpOnly` and `Secure`
- AND configured same-site behavior is applied consistently

### Requirement: Config, env, docs, automated tests, and Postman verification

The system SHALL validate required auth configuration for secrets, TTLs, cookie policy, and allowed frontend origins. For current local development and local testing, the root `.env` SHALL be the single source for Nest runtime, Prisma CLI, and local auth tests. The current scope SHALL NOT require `.env.development`, `.env.test`, or `NODE_ENV`-driven env-file switching. Delivery SHALL include `/docs/auth` feature documentation and SHALL follow strict TDD with unit plus e2e coverage as the PRIMARY verification for login, invalid login, refresh, refresh reuse/revocation, logout, `me`, admin guard, and cookie attributes. Delivery SHALL also include an importable Postman collection for implemented auth endpoints as SUPPLEMENTAL manual verification, stored at `test/postman/mecanismos-dashboard-auth.postman_collection.json` unless a repo-specific constraint later requires a different shared test-artifact location. For Slice 2, the Postman collection SHALL cover `login`, `refresh`, and `logout` only; `me` and admin requests SHALL be added when those endpoints are implemented. When CI, staging, or deployment environments are introduced, the system SHOULD add explicit environment separation before release automation depends on it.

#### Scenario: Local env source is shared
- GIVEN local auth development or local auth tests run on a developer machine
- WHEN Nest runtime, Prisma, and the local test flow resolve configuration
- THEN they use the root `.env` as the current source of truth
- AND the change does not require `.env.development` or `.env.test`

#### Scenario: Auth docs delivered
- GIVEN the change is completed
- WHEN reviewers inspect `/docs/auth`
- THEN they find overview, schema, security, and testing guidance for this feature

#### Scenario: Slice 2 Postman auth coverage delivered
- GIVEN Slice 2 auth endpoints are implemented
- WHEN reviewers import `test/postman/mecanismos-dashboard-auth.postman_collection.json` into Postman
- THEN they can manually exercise `login`, `refresh`, and `logout`
- AND automated unit/e2e tests remain the primary verification gate

#### Scenario: Later protected endpoints extend the collection
- GIVEN `me` or admin auth endpoints are implemented in later slices
- WHEN the Postman collection is updated
- THEN it includes those implemented protected requests alongside the auth session flows
