import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createE2EApp } from '../support/create-e2e-app';
import { loginAsRole } from '../support/auth-e2e';

type ReportRole = 'ADMIN' | 'SALES';

type SummaryResponse = {
  approximate: boolean;
  basis: string;
  window: {
    dateFrom: string | null;
    dateTo: string | null;
  };
  totals: {
    workOrders: {
      inProgress: number;
      paused: number;
      completed: number;
      cancelled: number;
    };
    paymentStatus: {
      pending: number;
      partial: number;
      paid: number;
    };
    paymentsCollected: number;
    pendingReceivables: number | null;
    actualCosts: number;
    paidExpenses: number;
    pendingExpenses: number;
    approximateUtility: number | null;
  };
};

type PendingPaymentsResponse = {
  approximate: boolean;
  basis: string;
  data: Array<{
    customerName: string | null;
    paymentStatus: string;
    payableAmount: number | null;
    paidTotal: number;
    balance: number | null;
    overpaid: boolean;
  }>;
};

type WorkOrderProfitabilityResponse = {
  approximate: boolean;
  basis: string;
  data: Array<{
    customerName: string | null;
    payableAmount: number | null;
    paidTotal: number;
    actualCostTotal: number;
    grossUtility: number | null;
    grossMargin: number | null;
  }>;
};

type MechanicsResponse = {
  approximate: boolean;
  basis: string;
  data: Array<{
    employeeName: string;
    assignedOrderCount: number;
    payableTotal: number | null;
    paidTotal: number;
    actualCosts: number;
    grossUtility: number | null;
    unknownPayableCount: number;
  }>;
};

type ExpensesResponse = {
  approximate: boolean;
  basis: string;
  data: Array<{
    period: string;
    expenseCategory: string;
    paymentStatus: string;
    costCenterId: string | null;
    costCenterName: string | null;
    totalAmount: number;
  }>;
};

describe('OperationsReportingController (real db e2e)', () => {
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

  describe.each<ReportRole>(['ADMIN', 'SALES'])('%s access', (role) => {
    it('returns JSON report payloads for every operations-reporting route', async () => {
      const cookies = await loginAsRole(app, role);

      await request(app.getHttpServer())
        .get('/operations-reporting/summary')
        .set('Cookie', cookies)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(({ body }: { body: SummaryResponse }) => {
          expectCashOperationalEnvelope(body);
          expect(body.totals.paymentsCollected).toBeGreaterThanOrEqual(620000);
          expect(body.totals.actualCosts).toBeGreaterThanOrEqual(182000);
          expect(body.totals.paidExpenses).toBeGreaterThanOrEqual(458000);
          expect(body.totals.pendingExpenses).toBeGreaterThanOrEqual(1500000);
          expect(body.totals.approximateUtility).toBe(
            body.totals.paymentsCollected -
              body.totals.actualCosts -
              body.totals.paidExpenses,
          );
          if (body.totals.pendingReceivables !== null) {
            expect(body.totals.pendingReceivables).toBeGreaterThanOrEqual(125000);
          }
          expect(body.totals.workOrders.inProgress).toBeGreaterThan(0);
          expect(body.totals.workOrders.completed).toBeGreaterThan(0);
          expect(body.totals.paymentStatus.pending).toBeGreaterThan(0);
          expect(body.totals.paymentStatus.paid).toBeGreaterThan(0);
        });

      await request(app.getHttpServer())
        .get('/operations-reporting/pending-payments')
        .set('Cookie', cookies)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(({ body }: { body: PendingPaymentsResponse }) => {
          expectCashOperationalEnvelope(body);
          expect(body.data).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                customerName: 'Ana Gomez',
                paymentStatus: 'PENDING',
                payableAmount: 125000,
                paidTotal: 0,
                balance: 125000,
                overpaid: false,
              }),
            ]),
          );
        });

      await request(app.getHttpServer())
        .get('/operations-reporting/work-order-profitability')
        .set('Cookie', cookies)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(({ body }: { body: WorkOrderProfitabilityResponse }) => {
          expectCashOperationalEnvelope(body);
          const workshopRow = body.data.find(
            (row) => row.customerName === 'Acme Industrial SAS',
          );

          expect(workshopRow).toMatchObject({
            payableAmount: 620000,
            paidTotal: 620000,
            actualCostTotal: 182000,
            grossUtility: 438000,
          });
          expect(workshopRow?.grossMargin).toBeCloseTo(438000 / 620000);
        });

      await request(app.getHttpServer())
        .get('/operations-reporting/mechanics')
        .set('Cookie', cookies)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(({ body }: { body: MechanicsResponse }) => {
          expectCashOperationalEnvelope(body);
          expect(body.data).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                employeeName: 'Ana Torres',
                assignedOrderCount: 1,
                payableTotal: 620000,
                paidTotal: 620000,
                actualCosts: 182000,
                grossUtility: 438000,
                unknownPayableCount: 0,
              }),
            ]),
          );
        });

      await request(app.getHttpServer())
        .get('/operations-reporting/expenses')
        .set('Cookie', cookies)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(({ body }: { body: ExpensesResponse }) => {
          expectCashOperationalEnvelope(body);
          expect(body.data).toHaveLength(3);
          expect(body.data).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                period: '2026-04-26',
                expenseCategory: 'UTILITY',
                paymentStatus: 'PAID',
                costCenterName: 'General',
                totalAmount: 420000,
              }),
              expect.objectContaining({
                period: '2026-05-08',
                expenseCategory: 'OTHER',
                paymentStatus: 'PAID',
                costCenterId: null,
                costCenterName: null,
                totalAmount: 38000,
              }),
              expect.objectContaining({
                period: '2026-05-15',
                expenseCategory: 'RENT',
                paymentStatus: 'PENDING',
                costCenterName: 'Oficina',
                totalAmount: 1500000,
              }),
            ]),
          );
        });
    });
  });

  it.each([
    '/operations-reporting/summary',
    '/operations-reporting/pending-payments',
    '/operations-reporting/work-order-profitability',
    '/operations-reporting/mechanics',
    '/operations-reporting/expenses',
  ])('rejects dateFrom later than dateTo for %s', async (route) => {
    const cookies = await loginAsRole(app, 'ADMIN');

    await request(app.getHttpServer())
      .get(route)
      .query({
        dateFrom: '2026-05-31T00:00:00.000Z',
        dateTo: '2026-05-01T00:00:00.000Z',
      })
      .set('Cookie', cookies)
      .expect(400)
      .expect('Content-Type', /json/)
      .expect(({ body }: { body: { message: string[] } }) => {
        expect(body.message).toContain(
          'dateTo must be greater than or equal to dateFrom',
        );
      });
  });
});

function expectCashOperationalEnvelope(body: {
  approximate: boolean;
  basis: string;
  window?: { dateFrom: string | null; dateTo: string | null };
}) {
  expect(body.approximate).toBe(true);
  expect(body.basis).toBe('cash-operational');
  expect(body.window).toEqual({
    dateFrom: null,
    dateTo: null,
  });
}
