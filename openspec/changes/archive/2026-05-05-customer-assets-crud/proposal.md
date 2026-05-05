# Proposal: Customer Assets CRUD

## Intent

Deliver the first protected customer-assets slice so ADMIN and SALES can create, read, and update customers, vehicles, and customer-owned components with traceability-safe rules.

## Scope

### In Scope
- Add protected CRUD-lite APIs (create/list/get/update) for customers, vehicles, and components.
- Add Prisma migration direction for `Customer.notes String?` and keep vehicle/component ownership immutable after creation.
- Deliver Swagger tags, feature docs in `docs/customer-assets/`, Postman collection, and strict TDD coverage.

### Out of Scope
- Delete endpoints, soft delete, or archival flows.
- MECHANIC access, inventory/work-order integrations beyond relation-safe references, and advanced search/index tuning.

## Capabilities

### New Capabilities
- `customer-assets-management`: Protected management of customers, vehicles, and customer-owned components, including relation validation, pragmatic search/listing, docs, Postman, and tests.

### Modified Capabilities
- `auth-session`: Extend protected-route direction beyond admin-only focus so `ADMIN | SALES` access can be expressed and documented for customer-assets endpoints.

## Approach

Use one feature package (`customer-assets-crud`) implemented as three Nest modules: `customers`, `vehicles`, and `components`. Reuse `JwtAuthGuard`, `@Roles()`, and `RolesGuard`; keep all endpoints protected; allow `ADMIN` and `SALES`; exclude `MECHANIC`. Update DTO/service contracts so vehicle/component updates cannot reassign `customerId`, and component updates cannot silently cross-link another customer's vehicle.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add `Customer.notes` and preserve current relation model |
| `prisma/migrations/*` | New | Migration for schema change |
| `src/app.module.ts` | Modified | Register new feature modules |
| `src/customers/**` | New | Customer controller/service/DTO/tests |
| `src/vehicles/**` | New | Vehicle controller/service/DTO/tests |
| `src/components/**` | New | Component controller/service/DTO/tests |
| `src/auth/roles.guard.ts` | Modified | Generalize forbidden messaging/role behavior |
| `docs/customer-assets/**` | New | Reviewer-facing feature docs |
| `test/postman/mecanismos-dashboard-customer-assets.postman_collection.json` | New | Importable manual API coverage |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| SALES permissions later need finer restrictions | Med | Spec role rules per endpoint now; defer metric-sensitive limits to design/future change |
| Search/list filters drift beyond schema support | Med | Keep v1 search minimal and index-aware |
| Ownership reassignment semantics become ambiguous | High | Explicitly forbid reassignment in DTO/service contract |

## Rollback Plan

Revert the customer-assets modules/docs/Postman artifacts and roll back the Prisma migration that adds `Customer.notes`; keep auth/session behavior unchanged if feature rollout is canceled.

## Dependencies

- Existing auth-session guards/roles
- Root `.env` local strategy
- Prisma generate after schema change

## Success Criteria

- [ ] Proposal leads to specs/design that define create/list/get/update endpoints for customers, vehicles, and components only.
- [ ] Schema direction includes `Customer.notes String?` and forbids vehicle/component customer reassignment in update flows.
- [ ] Access direction is protected, `ADMIN | SALES` enabled, `MECHANIC` excluded, with docs/Postman/tests required.
