import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { EstimatePhase } from '../../generated/prisma/enums';
import { PrismaService } from '../../src/prisma/prisma.service';
import { calculateCurrentStock } from '../../src/inventory/stock.helpers';
import {
  calculateBalance,
  resolvePayableAmount,
} from '../../src/operations-reporting/calculations/operations-reporting.calculations';
import { createE2EApp } from '../support/create-e2e-app';
import { loginAsRole } from '../support/auth-e2e';

type DashboardRole = 'ADMIN' | 'SALES';

const OVERVIEW_RANGE = {
  from: '2026-04-01T00:00:00.000Z',
  to: '2026-05-31T23:59:59.999Z',
} as const;

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
    expenseCoverage: {
      paid: number;
      expected: number;
      ratio: number | null;
      remaining: number;
    };
    payrollCoverage: {
      covered: number;
      payrollTotal: number;
      ratio: number | null;
      remaining: number;
    };
    receivablesCollection: {
      collected: number;
      knownPayable: number;
      ratio: number | null;
      remaining: number | null;
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
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.AUTH_ACCESS_TOKEN_SECRET = 'access-secret';
    process.env.AUTH_REFRESH_TOKEN_SECRET = 'refresh-secret';
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';
    app = await createE2EApp();
    prisma = app.get(PrismaService);
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

      const response = await request(app.getHttpServer())
        .get('/dashboard/overview')
        .query(OVERVIEW_RANGE)
        .set('Cookie', cookies)
        .expect(200)
        .expect('Content-Type', /json/);

      const body = response.body as DashboardOverviewResponse;

      expect(body.range).toEqual(OVERVIEW_RANGE);
      await expectOverviewToMatchCurrentData(prisma, body);
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

async function expectOverviewToMatchCurrentData(
  prisma: PrismaService,
  body: DashboardOverviewResponse,
) {
  const range = {
    from: new Date(OVERVIEW_RANGE.from),
    to: new Date(OVERVIEW_RANGE.to),
  };

  const [
    workOrders,
    collectedAggregate,
    actualCostsAggregate,
    paidExpenses,
    pendingExpenses,
    inventoryItems,
    payrollSnapshot,
  ] = await Promise.all([
    prisma.workOrder.findMany({
      where: { createdAt: { gte: range.from, lte: range.to } },
      select: {
        status: true,
        paymentStatus: true,
        number: true,
        estimatedCollectionAt: true,
        Customer: { select: { name: true } },
        WorkOrderEstimate: {
          select: { phase: true, totalPriceAmount: true },
          orderBy: { createdAt: 'asc' },
        },
        WorkOrderPayment: {
          select: { amount: true },
        },
      },
    }),
    prisma.workOrderPayment.aggregate({
      where: { paidAt: { gte: range.from, lte: range.to } },
      _sum: { amount: true },
    }),
    prisma.workOrderActualCost.aggregate({
      where: { incurredAt: { gte: range.from, lte: range.to } },
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      where: { paidAt: { not: null, gte: range.from, lte: range.to } },
      select: { amount: true },
    }),
    prisma.expense.findMany({
      where: { paidAt: null, expectedAt: { gte: range.from, lte: range.to } },
      select: { id: true, amount: true },
    }),
    prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        minimumStock: true,
        InventoryMovement: {
          where: { occurredAt: { lte: range.to } },
          select: { movementType: true, quantity: true },
        },
      },
    }),
    prisma.employeeMonthlyPayroll.findFirst({
      where: {
        OR: [
          { year: 2026, month: 4 },
          { year: 2026, month: 5 },
        ],
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: { year: true, month: true, status: true, grandTotal: true },
    }),
  ]);

  const collected = collectedAggregate._sum.amount ?? 0;
  const actualCosts = actualCostsAggregate._sum.amount ?? 0;
  const paidExpensesTotal = sumAmounts(paidExpenses);
  const pendingExpensesTotal = sumAmounts(pendingExpenses);
  const payrollTotal = payrollSnapshot?.grandTotal ?? 0;
  const receivables = summarizeReceivables(workOrders);
  const lowStockCount = inventoryItems.filter(
    (item) =>
      calculateCurrentStock(
        item.InventoryMovement.map((movement) => ({
          inventoryItemId: item.id,
          movementType: movement.movementType,
          _sum: { quantity: movement.quantity },
        })),
      ) <= item.minimumStock,
  ).length;

  expect(body.kpis.workOrders).toEqual({
    open: countByStatus(workOrders, 'IN_PROGRESS'),
    completed: countByStatus(workOrders, 'COMPLETED'),
    paused: countByStatus(workOrders, 'PAUSED'),
    cancelled: countByStatus(workOrders, 'CANCELLED'),
  });
  expect(body.kpis.cash).toEqual({
    collected,
    actualCosts,
    paidExpenses: paidExpensesTotal,
    pendingExpenses: pendingExpensesTotal,
    pendingReceivables:
      receivables.unknownPayableCount > 0
        ? null
        : receivables.remainingKnownTotal,
    approximateUtility: collected - actualCosts - paidExpensesTotal,
  });
  expect(body.kpis.inventory.lowStockCount).toBe(lowStockCount);
  expect(body.kpis.payroll).toEqual({
    grandTotal: payrollSnapshot?.grandTotal ?? null,
    status: payrollSnapshot?.status ?? null,
    monthLabel: payrollSnapshot
      ? `${payrollSnapshot.year}-${String(payrollSnapshot.month).padStart(2, '0')}`
      : null,
  });

  expect(body.progress.expenseCoverage).toEqual({
    paid: collected,
    expected: pendingExpensesTotal + payrollTotal,
    ratio: toRatio(collected, pendingExpensesTotal + payrollTotal),
    remaining: Math.max(pendingExpensesTotal + payrollTotal - collected, 0),
  });
  expect(body.progress.payrollCoverage).toEqual({
    covered: collected,
    payrollTotal,
    ratio: toRatio(collected, payrollTotal),
    remaining: Math.max(payrollTotal - collected, 0),
  });
  expect(body.progress.receivablesCollection).toEqual({
    collected,
    knownPayable: receivables.knownPayableTotal,
    ratio: toRatio(collected, receivables.knownPayableTotal),
    remaining:
      receivables.knownPayableTotal > 0
        ? Math.max(receivables.knownPayableTotal - collected, 0)
        : 0,
    unknownPayableCount: receivables.unknownPayableCount,
  });

  expect(body.alerts.pendingReceivables).toBe(receivables.pendingCount);
  expect(body.alerts.pendingExpensesDue).toBe(pendingExpenses.length);
  expect(body.alerts.lowStockItems).toBe(lowStockCount);
  expect(body.alerts.unknownPayables).toBe(receivables.unknownPayableCount);
  expect(body.alerts.previews.pendingReceivables.length).toBeLessThanOrEqual(3);
  expect(body.alerts.previews.pendingExpenses.length).toBeLessThanOrEqual(3);
  expect(body.alerts.previews.lowStockItems.length).toBeLessThanOrEqual(3);
  expect(body.recentActivity).toHaveLength(5);
  expect(body.metadata.approximate).toBe(receivables.unknownPayableCount > 0);
  expect(body.metadata.basis).toBe('dashboard-overview');
  expect(body.metadata.notes).toContain(
    `Pending receivables are approximate because ${receivables.unknownPayableCount} work order has no reliable payable amount.`,
  );
  expect(body.metadata.sectionDateBasis).toMatchObject({
    workOrders: 'createdAt/completedAt',
    cash: 'paidAt/incurredAt/expectedAt',
    inventory: 'occurredAt',
    payroll: 'year-month overlap',
    recentActivity: 'occurredAt',
  });
}

function sumAmounts(rows: Array<{ amount: number }>) {
  return rows.reduce((total, row) => total + row.amount, 0);
}

function countByStatus(
  rows: Array<{ status: string }>,
  status: 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'CANCELLED',
) {
  return rows.filter((row) => row.status === status).length;
}

function summarizeReceivables(
  workOrders: Array<{
    paymentStatus: string;
    WorkOrderEstimate: Array<{
      phase: EstimatePhase;
      totalPriceAmount: number;
    }>;
    WorkOrderPayment: Array<{ amount: number }>;
  }>,
) {
  return workOrders.reduce(
    (summary, workOrder) => {
      const payableAmount = resolvePayableAmount(workOrder.WorkOrderEstimate);
      const paidTotal = sumAmounts(workOrder.WorkOrderPayment);
      const balance = calculateBalance({ payableAmount, paidTotal });
      const isCollectionTracked = workOrder.paymentStatus !== 'PENDING';
      const isPendingReceivable =
        workOrder.paymentStatus === 'PENDING' ||
        workOrder.paymentStatus === 'PARTIAL';

      if (payableAmount !== null && isCollectionTracked) {
        summary.knownPayableTotal += payableAmount;
      }

      if (balance !== null && isPendingReceivable) {
        summary.pendingCount += 1;
        summary.remainingKnownTotal += Math.max(balance, 0);
      }

      if (isPendingReceivable && payableAmount === null) {
        summary.unknownPayableCount += 1;
      }

      return summary;
    },
    {
      knownPayableTotal: 0,
      remainingKnownTotal: 0,
      unknownPayableCount: 0,
      pendingCount: 0,
    },
  );
}

function toRatio(collected: number, total: number) {
  if (total <= 0) {
    return null;
  }

  return collected / total;
}
