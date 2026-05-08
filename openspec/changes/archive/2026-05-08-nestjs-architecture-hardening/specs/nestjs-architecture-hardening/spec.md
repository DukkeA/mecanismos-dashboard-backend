# NestJS Architecture Hardening Specification

## Purpose

Define observable architecture standards for the NestJS backend so structure, testing, and documentation improve without changing existing business behavior.

## Requirements

### Requirement: Inventory Layout Clarity

The project MUST keep inventory code in a single flat feature layout until a distinct runtime submodule is justified. Empty or placeholder inventory subfolders SHALL NOT remain in the repository.

#### Scenario: Inventory stays flat until behavior demands more

- GIVEN inventory behavior is still owned by the current feature module
- WHEN the repository layout is reviewed
- THEN active inventory files are organized directly under `src/inventory/`
- AND empty placeholder inventory subfolders are absent

### Requirement: Common Helper Boundary

Reusable transforms, parsers, or similar cross-cutting helpers used by multiple features MUST live under `src/common/`. Helpers used by only one feature SHOULD remain module-local. A feature DTO or service SHALL NOT import a shared helper from another feature's private folder.

#### Scenario: Shared helper placement follows reuse boundary

- GIVEN a transform or parser is used by more than one feature module
- WHEN its owning file is reviewed
- THEN the helper is defined under `src/common/`
- AND feature-internal helpers remain near their owning module when not reused elsewhere

### Requirement: Explicit Prisma Module Ownership

Prisma access MUST be centralized behind an explicit `PrismaModule` that consuming modules import directly. `PrismaService` SHALL have one module owner and MUST NOT rely on global hidden availability or duplicate feature-level ownership declarations.

#### Scenario: Feature modules consume Prisma explicitly

- GIVEN a feature module depends on Prisma-backed repositories or services
- WHEN its Nest module metadata is inspected
- THEN it imports `PrismaModule`
- AND it does not redeclare `PrismaService` as its own provider owner

### Requirement: Safe Realistic E2E Execution

`npm run test:e2e` MUST execute realistic DB-backed HTTP tests against `DATABASE_URL_TEST`. The e2e flow MUST fail fast when `DATABASE_URL_TEST` is missing, unsafe, or resolves to the development database. E2E bootstrap SHALL apply production-equivalent global request validation and app middleware, and migration/seed steps MUST target only the test database.

#### Scenario: E2E fails when test database isolation is not explicit

- GIVEN `DATABASE_URL_TEST` is missing or points to the non-test database
- WHEN `npm run test:e2e` is executed
- THEN the e2e flow stops with an explicit safety failure
- AND no silent fallback to `DATABASE_URL` occurs

#### Scenario: E2E mirrors production request bootstrap

- GIVEN `npm run test:e2e` runs with a valid test database
- WHEN an HTTP request reaches the test app
- THEN production-equivalent global validation and middleware are active
- AND seeded or migrated data preparation applies only to the test database

### Requirement: Test Taxonomy and Learning Documentation

Project documentation MUST preserve a clear testing taxonomy: unit (`npm run test`), e2e (`npm run test:e2e`), and Postman/manual verification. Learning-oriented docs under `aprendizaje/` MUST explain NestJS modules, providers, dependency injection, controllers, services, repositories, `PrismaModule`, and testing conventions, using concise examples and frontend analogies where they improve understanding.

#### Scenario: Contributors can identify the correct test and architecture guidance

- GIVEN a contributor reviews the project documentation
- WHEN they look for testing and NestJS architecture guidance
- THEN they find the unit/e2e/Postman taxonomy without competing primary commands
- AND they find `aprendizaje/` guides that explain the agreed module and DI conventions

### Requirement: Existing API Behavior Preservation

This architecture hardening change MUST preserve current published HTTP routes, request validation outcomes, response contract shapes, and business results unless another approved spec explicitly changes that behavior.

#### Scenario: Refactors remain behavior-neutral

- GIVEN the architecture hardening work is complete
- WHEN existing API routes are exercised through current clients or regression tests
- THEN previously supported business flows continue to succeed with the same observable contracts
- AND any intentional behavior change requires a separate approved spec
