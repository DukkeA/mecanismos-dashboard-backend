# Work orders validation rules

## Request rules

- `type`, `customerId`, and `summary` are required on create.
- `WORKSHOP` may send `customerReportedIssue`, `diagnosisRequired`, and `diagnosisSummary`; `SALE` must not rely on workshop-only persistence.
- Estimate `phase` is only `INITIAL` or `FINAL`.
- Estimate lines accept optional inventory/service/supplier/quote links, but those relations must already exist.
- Actual costs and payments use integers for amounts and ISO dates for `incurredAt` / `paidAt`.

## Seed and reviewer rules

- Reviewer docs may reference the stable seed IDs directly.
- Runner mutations must capture created IDs from responses.
- Do not hardcode generated IDs in docs, Postman requests, or artifact tests.

## Relationship rules

- Vehicle and component links must belong to the selected customer.
- `DIRECT_PURCHASE` actual costs require a supplier.
- Payment status should match the seeded financial picture: the workshop example is fully paid, the sale example stays pending.
