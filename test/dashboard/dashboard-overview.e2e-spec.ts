import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createE2EApp } from '../support/create-e2e-app';
import { loginAsRole } from '../support/auth-e2e';

type DashboardRole = 'ADMIN' | 'SALES';

type DashboardOverviewResponse = {
  range: { from: string | null; to: string | null };
  kpis: {
    workOrders: {
      open: number;
      completed: number;
      paused: number;
      cancelled: number;
    };
    cash: {
      collected: number;
      actualCosts: number;
      paidExpenses: number;
      pendingExpenses: number;
      pendingReceivables: number | null;
      approximateUtility: number | null;
    };
    inventory: { lowStockCount: number };
    payroll: {
      grandTotal: number | null;
      status: string | null;
      monthLabel: string | null;
    };
  };
  progress: {
    expenseCoverage: { ratio: number | null; remaining: number };
    payrollCoverage: { ratio: number | null; remaining: number };
    receivablesCollection: {
      knownPayable: number;
      unknownPayableCount: number;
    };
  };
  alerts: {
    pendingReceivables: number;
    pendingExpensesDue: number;
    lowStockItems: number;
    unknownPayables: number;
    previews: {
      pendingReceivables: unknown[];
      pendingExpenses: unknown[];
      lowStockItems: unknown[];
    };
  };
  recentActivity: Array<{ type: string; occurredAt: string; label: string }>;
  metadata: {
    approximate: boolean;
    basis: string;
    notes: string[];
    sectionDateBasis: Record<string, string>;
  };
};

describe('DashboardController (real db e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.AUTH_ACCESS_TOKEN_SECRET = 'access-secret';
    process.env.AUTH_REFRESH_TOKEN_SECRET = 'refresh-secret';
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';
    app = await createE2EApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated overview requests', async () => {
    await request(app.getHttpServer()).get('/dashboard/overview').expect(401);
  });

  it('rejects MECHANIC overview access', async () => {
    const mechanicCookies = await loginAsRole(app, 'MECHANIC');

    await request(app.getHttpServer())
      .get('/dashboard/overview')
      .set('Cookie', mechanicCookies)
      .expect(403)
      .expect(({ body }: { body: { message: string } }) => {
        expect(body.message).toBe('Allowed roles: ADMIN | SALES');
      });
  });

  it.each<DashboardRole>(['ADMIN', 'SALES'])(
    'returns a dashboard overview contract for %s with flexible from/to dates',
    async (role) => {
      const cookies = await loginAsRole(app, role);

      await request(app.getHttpServer())
        .get('/dashboard/overview')
        .query({
          from: '2026-04-01T00:00:00.000Z',
          to: '2026-05-31T23:59:59.999Z',
        })
        .set('Cookie', cookies)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(({ body }: { body: DashboardOverviewResponse }) => {
          expect(body.range).toEqual({
            from: '2026-04-01T00:00:00.000Z',
            to: '2026-05-31T23:59:59.999Z',
          });
          expect(body.kpis.cash).toMatchObject({
            collected: 750000,
            actualCosts: 362000,
            paidExpenses: 458000,
            pendingExpenses: 1500000,
            pendingReceivables: null,
            approximateUtility: -70000,
          });
          expect(body.kpis.payroll).toMatchObject({
            grandTotal: 5850000,
            status: 'FINALIZED',
            monthLabel: '2026-04',
          });
          expect(body.progress.receivablesCollection).toMatchObject({
            knownPayable: 870000,
            unknownPayableCount: 1,
          });
          expect(body.alerts).toMatchObject({
            pendingReceivables: 2,
            pendingExpensesDue: 1,
            unknownPayables: 1,
          });
          expect(
            body.alerts.previews.pendingReceivables.length,
          ).toBeLessThanOrEqual(3);
          expect(
            body.alerts.previews.pendingExpenses.length,
          ).toBeLessThanOrEqual(3);
          expect(body.alerts.previews.lowStockItems.length).toBeLessThanOrEqual(
            3,
          );
          expect(body.recentActivity).toHaveLength(5);
          expect(body.metadata.approximate).toBe(true);
          expect(body.metadata.basis).toBe('dashboard-overview');
          expect(body.metadata.notes).toContain(
            'Pending receivables are approximate because 1 work order has no reliable payable amount.',
          );
          expect(body.metadata.sectionDateBasis).toMatchObject({
            workOrders: 'createdAt/completedAt',
            cash: 'paidAt/incurredAt/expectedAt',
            inventory: 'occurredAt',
            payroll: 'year-month overlap',
            recentActivity: 'occurredAt',
          });
        });
    },
  );

  it('supports open-ended ranges with only from or only to', async () => {
    const cookies = await loginAsRole(app, 'ADMIN');

    await request(app.getHttpServer())
      .get('/dashboard/overview')
      .query({ from: '2026-05-01T00:00:00.000Z' })
      .set('Cookie', cookies)
      .expect(200)
      .expect(({ body }: { body: DashboardOverviewResponse }) => {
        expect(body.range.from).toBe('2026-05-01T00:00:00.000Z');
        expect(body.range.to).toBeNull();
      });

    await request(app.getHttpServer())
      .get('/dashboard/overview')
      .query({ to: '2026-05-31T23:59:59.999Z' })
      .set('Cookie', cookies)
      .expect(200)
      .expect(({ body }: { body: DashboardOverviewResponse }) => {
        expect(body.range.from).toBeNull();
        expect(body.range.to).toBe('2026-05-31T23:59:59.999Z');
      });
  });

  it('rejects invalid or reversed ranges before reading dashboard data', async () => {
    const cookies = await loginAsRole(app, 'ADMIN');

    await request(app.getHttpServer())
      .get('/dashboard/overview')
      .query({ from: 'not-a-date' })
      .set('Cookie', cookies)
      .expect(400);

    await request(app.getHttpServer())
      .get('/dashboard/overview')
      .query({
        from: '2026-05-31T00:00:00.000Z',
        to: '2026-05-01T00:00:00.000Z',
      })
      .set('Cookie', cookies)
      .expect(400)
      .expect(({ body }: { body: { message: string[] } }) => {
        expect(body.message).toContain(
          'to must be greater than or equal to from',
        );
      });
  });
});
