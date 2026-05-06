# Design: Supplier Management

## Technical Approach

Implement suppliers as a dedicated NestJS resource backed by a Prisma supplier aggregate: parent `Supplier` + child `SupplierPhone`. Reuse the existing controller → service → repository pattern, keep auth/roles aligned with current protected CRUD, and migrate legacy `Supplier.phone` data into child rows before removing the flat column.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Phone modeling | Add `SupplierPhone` (`id`, `supplierId`, `label?`, `phone`, `isPrimary`, `hasWhatsapp`, timestamps) and remove flat `Supplier.phone` | Keep one `phone`; JSON array on `Supplier` | Normalized rows fit Prisma relations, child search, and future history better. |
| Supplier identity | Keep `Supplier.id`; add `type` (`PERSON \| COMPANY`), optional `documentType?`, `documentNumber?`, `notes?`; drop global `name @unique` | Keep unique name; force document uniqueness | Product prefers low-friction capture; duplicate names are acceptable in v1. |
| Phone updates | If `phones` is omitted on PATCH, keep current phones. If present, validate then replace the full child set inside one transaction (`deleteMany` + `createMany`) | Per-phone PATCH API; diff-based merge | Full replacement is simpler, safer, and easier to reason about for reviewers. |
| Primary phone rule | Service enforces exactly one primary phone on create/update payloads | DB trigger/partial unique index only | Prisma schema cannot express “exactly one primary child” cleanly across rows; service rule is explicit and testable. |

## Data Flow

`Controller` → DTO validation/transform → `SuppliersService` business rules → `SuppliersRepository` Prisma writes/queries → PostgreSQL

Create/update flow:

1. Controller accepts `ADMIN | SALES` only.
2. DTO trims strings and normalizes email.
3. Service rejects empty `phones`, zero primaries, or multiple primaries.
4. Repository writes parent + child phones in a Prisma transaction.
5. Response includes supplier with ordered `phones`.

List flow:

`GET /suppliers?search=300` builds `OR` search on `name`, `email`, `documentNumber`, and `phones.some.phone`.

## File Changes

| File | Action | Description |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `SupplierType`, `SupplierDocumentType`, extra supplier fields, `SupplierPhone`, relation, and remove `Supplier.phone`/`name @unique`. |
| `prisma/migrations/*/migration.sql` | Create | Additive schema + backfill + cleanup migration. |
| `prisma/seed.ts` | Modify | Add idempotent suppliers with multiple phones. |
| `src/app.module.ts` | Modify | Register `SuppliersModule`. |
| `src/suppliers/**` | Create | Module, controller, service, repository, DTOs, tests. |
| `docs/suppliers/*.md` | Create | Overview, API map, validation, testing. |
| `src/suppliers/suppliers.artifacts.spec.ts` | Create | Verifies docs/Postman artifacts. |
| `test/suppliers/suppliers.e2e-spec.ts` | Create | Auth/role/validation/status coverage. |
| `test/postman/mecanismos-dashboard-suppliers.postman_collection.json` | Create | Runner-ready manual verification. |

## Interfaces / Contracts

```ts
type SupplierPhoneInput = {
  label?: string;
  phone: string;
  isPrimary: boolean;
  hasWhatsapp?: boolean;
};

type CreateSupplierDto = {
  name: string;
  type: 'PERSON' | 'COMPANY';
  documentType?: 'CEDULA' | 'NIT' | 'OTHER';
  documentNumber?: string;
  email?: string;
  notes?: string;
  isActive?: boolean;
  phones: SupplierPhoneInput[];
};

type UpdateSupplierDto = Partial<Omit<CreateSupplierDto, 'phones'>> & {
  phones?: SupplierPhoneInput[];
};
```

HTTP contracts: `POST /suppliers`, `GET /suppliers`, `GET /suppliers/:id`, `PATCH /suppliers/:id`. Errors: `401` unauthenticated, `403` forbidden role, `404` supplier not found, `400` invalid phone-primary contract, `409` reserved for future document uniqueness only if later introduced.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Primary-phone rule, update replacement semantics, not-found mapping | `suppliers.service.spec.ts` with repository mocks |
| Unit | Query shape, email normalization, transaction payloads | `persistence/suppliers.repository.spec.ts` |
| E2E | `ADMIN`/`SALES` allowed, `MECHANIC` forbidden, DTO validation, HTTP statuses | Service-overridden Nest e2e spec mirroring customers pattern |
| Artifact | Docs and Postman presence/content | `suppliers.artifacts.spec.ts` |

## Migration / Rollout

1. Add enums/columns/table without removing legacy column.
2. Backfill: for every supplier with non-null legacy `phone`, create one `SupplierPhone` marked `isPrimary=true`.
3. Drop old unique index on `Supplier.name`.
4. Drop legacy `Supplier.phone` only after backfill succeeds.
5. Regenerate Prisma client, update seed, then expose API.

Rollback: revert API/module/docs/tests, restore legacy column from `SupplierPhone` primary rows if rollback happens after deploy, and reapply name uniqueness ONLY after confirming no duplicates were inserted.

## Open Questions

- [ ] None blocking. The implementation should log if legacy data contains blank phones so migration review can confirm skipped rows.
