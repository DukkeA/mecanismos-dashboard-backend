# Dashboard overview testing guide

## Focused checks

- Unit/integration: `npm run test -- src/dashboard/dto/dashboard-overview-query.dto.spec.ts src/dashboard/dashboard.controller.spec.ts src/dashboard/dashboard.service.spec.ts src/dashboard/dashboard.repository.spec.ts`
- E2E: `npm run test:e2e -- test/dashboard/dashboard-overview.e2e-spec.ts`

## Reviewer flow

1. Run `npx prisma db seed`.
2. Log in as `admin@mecanismos.test` or `ventas@mecanismos.test`.
3. Run `test/postman/mecanismos-dashboard-dashboard-overview.postman_collection.json`.
4. Confirm the mechanic-forbidden request and the reversed-range request both fail.
