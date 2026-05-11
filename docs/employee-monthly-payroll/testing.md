# Employee monthly payroll testing guide

## Fast checks

- `npm run test -- src/employee-monthly-payroll/employee-monthly-payroll.service.spec.ts`
- `npm run test -- src/employee-monthly-payroll/employee-monthly-payroll.repository.spec.ts`
- `npm run test -- src/employee-monthly-payroll/employee-monthly-payroll.controller.spec.ts`
- `npm run test -- src/employee-monthly-payroll/employee-monthly-payroll.seed.spec.ts`
- `npm run test -- src/employee-monthly-payroll/employee-monthly-payroll.artifacts.spec.ts`

## Real-db flow

- `npm run test:e2e -- test/employee-monthly-payroll/employee-monthly-payroll.e2e-spec.ts`

## Reviewer notes

- Verify regenerate keeps the same draft id.
- Verify finalized periods reject regeneration.
- Verify payroll totals match salary snapshots plus in-month bonuses.
