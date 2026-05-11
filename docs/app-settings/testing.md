# App settings testing guide

## Quick path

- Focused unit/docs checks: `npm run test -- src/app-settings/**/*.spec.ts`
- Focused e2e path: `npm run test:e2e -- test/app-settings/app-settings.e2e-spec.ts`
- Lane gate when requested: `npm run test`

## Reviewer flow

1. Run `npx prisma db seed`.
2. Use the Postman collection to login as SALES and confirm reads.
3. Patch the singleton as ADMIN.
4. Re-read as SALES and confirm the new values persisted.
5. Send one invalid PATCH and confirm the singleton does not drift.

## Why this matters

- Pricing defaults are now operational configuration, not tribal knowledge.
- The e2e flow protects auth, validation, and persistence behavior together.
- Work-order estimate tests separately prove the no-retroactive snapshot semantics for future estimates.
- `npm run test` remains the strict TDD gate for this lane.
