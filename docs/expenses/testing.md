# Expenses testing guide

## Commands

- Unit/spec focus: `npm run test -- src/expenses/dto/expense-dtos.spec.ts src/expenses/expenses.module.spec.ts src/expenses/persistence/expenses.repository.spec.ts src/expenses/expenses.service.spec.ts src/expenses/expenses.controller.spec.ts src/expenses/expenses.seed.spec.ts src/expenses/expenses.artifacts.spec.ts`
- E2E focus: `npm run test:e2e -- test/expenses/expenses.e2e-spec.ts`
- Typecheck: `npx tsc --noEmit`

## Reviewer flow

1. Seed the dev database with `npx prisma db seed` if you want stable paid/unpaid examples plus default cost centers.
2. Run the Postman collection in `test/postman/mecanismos-dashboard-expenses.postman_collection.json`.
3. Confirm scheduled create, paid update, list/get filters, unknown cost-center `404`, missing expense `404`, forbidden `MECHANIC`, and unpaid `paymentMethod` `400`.

## Seed note

Expense reviewer flows assume `prisma/seed.ts` already ran `seedDefaultCostCenters` before `seedExpenses`. The collection itself creates its own runtime expense for isolated verification.

## Rollback order

1. Remove runtime/docs/Postman artifacts that depend on `/expenses`.
2. Revert the expenses module wiring, tests, and seed helper usage.
3. Revert expense seed additions after downstream reviewer flows stop depending on them.

## Why rollback order matters

The reviewer artifacts and seeds assume the expenses module is present and seeded cost centers exist first. If you roll back seed or runtime pieces out of order, reviewer scripts drift out of sync.
