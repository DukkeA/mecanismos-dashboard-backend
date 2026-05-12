import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import {
  InventoryCondition,
  InventoryItemType,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createE2EApp } from '../support/create-e2e-app';
import { loginAsRole } from '../support/auth-e2e';

type DashboardRole = 'ADMIN' | 'SALES';

type DashboardActionItemsResponse = {
  range: { from: string | null; to: string | null };
  items: Array<{
    id: string;
    category: string;
    severity: string;
    status: string;
    title: string;
    entity: { type: string; id: string; label: string; href: string | null };
    dueAt: string | null;
    amount: number | null;
    riskFlags: string[];
    dateBasis: string;
    notes: string[];
  }>;
  metadata: {
    approximate: boolean;
    itemCount: number;
    categoryCounts: Record<string, number>;
    dateBasis: Record<string, string>;
    notes: string[];
  };
};

const ACTION_RANGE = {
  from: '2026-05-01',
  to: '2026-05-31',
} as const;

describe('Dashboard action items (real db e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.AUTH_ACCESS_TOKEN_SECRET = 'access-secret';
    process.env.AUTH_REFRESH_TOKEN_SECRET = 'refresh-secret';
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';
    app = await createE2EApp();
    prisma = app.get(PrismaService);
    await seedPriceRiskActionItem(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated action-item requests', async () => {
    await request(app.getHttpServer())
      .get('/dashboard/action-items')
      .expect(401);
  });

  it('rejects MECHANIC action-item access with dashboard role messaging', async () => {
    const mechanicCookies = await loginAsRole(app, 'MECHANIC');

    await request(app.getHttpServer())
      .get('/dashboard/action-items')
      .query(ACTION_RANGE)
      .set('Cookie', mechanicCookies)
      .expect(403)
      .expect(({ body }: { body: { message: string } }) => {
        expect(body.message).toBe('Allowed roles: ADMIN | SALES');
      });
  });

  it('rejects invalid ranges and unsupported query parameters', async () => {
    const cookies = await loginAsRole(app, 'ADMIN');

    await request(app.getHttpServer())
      .get('/dashboard/action-items')
      .query({ from: '2026-06-01', to: '2026-05-31' })
      .set('Cookie', cookies)
      .expect(400)
      .expect(({ body }: { body: { message: string[] } }) => {
        expect(body.message).toContain(
          'to must be greater than or equal to from',
        );
      });

    await request(app.getHttpServer())
      .get('/dashboard/action-items')
      .query({ ...ACTION_RANGE, period: 'month' })
      .set('Cookie', cookies)
      .expect(400)
      .expect(({ body }: { body: { message: string[] } }) => {
        expect(body.message).toContain('property period should not exist');
      });
  });

  it.each<DashboardRole>(['ADMIN', 'SALES'])(
    'returns representative action items for %s without changing overview access',
    async (role) => {
      const cookies = await loginAsRole(app, role);

      const response = await request(app.getHttpServer())
        .get('/dashboard/action-items')
        .query(ACTION_RANGE)
        .set('Cookie', cookies)
        .expect(200)
        .expect('Content-Type', /json/);

      const body = response.body as DashboardActionItemsResponse;

      expect(body.range).toEqual(ACTION_RANGE);
      expect(body.metadata.itemCount).toBe(body.items.length);
      expect(body.metadata.approximate).toBe(true);
      expect(body.metadata.categoryCounts).toMatchObject({
        WORK_ORDER_OVERDUE: 3,
        RECEIVABLE: 3,
        EXPENSE: 1,
        LOW_STOCK: 2,
        PRICE_RISK: 1,
        CASH_RISK: 1,
      });
      expect(body.metadata.dateBasis).toMatchObject({
        WORK_ORDER_OVERDUE: 'estimatedCompletionAt',
        RECEIVABLE: 'estimatedCollectionAt',
        EXPENSE: 'expectedAt',
        LOW_STOCK: 'stock as of range.to',
        PRICE_RISK: 'active quote state as of range.to',
        CASH_RISK: 'selected range collections vs pending expenses',
      });
      expect(body.metadata.notes).toContain(
        'Nullable amounts represent unknown values, not zero.',
      );

      expectCategoryItem(body, 'WORK_ORDER_OVERDUE', {
        entityId: 'seed-work-order-sale-counter-quote',
        dueAt: '2026-05-14',
        amount: null,
        dateBasis: 'estimatedCompletionAt',
      });
      expectCategoryItem(body, 'RECEIVABLE', {
        entityId: 'seed-work-order-workshop-partial-payment',
        dueAt: '2026-05-19',
        amount: 150000,
        dateBasis: 'estimatedCollectionAt',
      });
      expectCategoryItem(body, 'EXPENSE', {
        entityId: 'seed-expense-rent-may',
        dueAt: '2026-05-15',
        amount: 1500000,
        dateBasis: 'expectedAt',
      });
      expectCategoryItem(body, 'LOW_STOCK', {
        entityId: 'seed-inventory-item-cotizable-tobera',
        dueAt: null,
        amount: 0,
        dateBasis: 'stock as of range.to',
      });

      expectCategoryItem(body, 'PRICE_RISK', {
        entityId: 'e2e-action-price-risk-no-price',
        dueAt: null,
        amount: null,
        dateBasis: 'active quote state as of range.to',
      });

      const unknownPayable = expectCategoryItem(body, 'RECEIVABLE', {
        entityId: 'seed-work-order-workshop-unknown-payable',
        dueAt: '2026-05-21',
        amount: null,
        dateBasis: 'estimatedCollectionAt',
      });
      expect(unknownPayable.riskFlags).toContain('unknownPayable');
      expect(unknownPayable.notes.join(' ')).toContain('unknown');

      const cashRisk = expectCategoryItem(body, 'CASH_RISK', {
        entityId: 'selected-range',
        dueAt: null,
        amount: null,
        dateBasis: 'selected range collections vs pending expenses',
      });
      expect(cashRisk.riskFlags).toContain('cashPressureApproximate');
      expect(cashRisk.notes.join(' ')).toContain(
        'not a ledger-grade cash forecast',
      );

      await request(app.getHttpServer())
        .get('/dashboard/overview')
        .query({
          from: '2026-04-01T00:00:00.000Z',
          to: '2026-05-31T23:59:59.999Z',
        })
        .set('Cookie', cookies)
        .expect(200)
        .expect(({ body }: { body: { metadata: { basis: string } } }) => {
          expect(body.metadata.basis).toBe('dashboard-overview');
        });
    },
  );

  it('returns a DB-backed PRICE_RISK advisory for low-stock inventory without active pricing', async () => {
    const cookies = await loginAsRole(app, 'ADMIN');

    const response = await request(app.getHttpServer())
      .get('/dashboard/action-items')
      .query(ACTION_RANGE)
      .set('Cookie', cookies)
      .expect(200);

    const body = response.body as DashboardActionItemsResponse;
    const priceRisk = expectCategoryItem(body, 'PRICE_RISK', {
      entityId: 'e2e-action-price-risk-no-price',
      dueAt: null,
      amount: null,
      dateBasis: 'active quote state as of range.to',
    });

    expect(priceRisk.severity).toBe('info');
    expect(priceRisk.status).toBe('advisory');
    expect(priceRisk.riskFlags).toEqual(['unknownPrice']);
    expect(priceRisk.title).toContain('Unknown price risk');
    expect(priceRisk.notes.join(' ')).toContain(
      'advisory, not a loss estimate',
    );
    expect(body.metadata.categoryCounts.PRICE_RISK).toBeGreaterThanOrEqual(1);
    expect(body.metadata.notes).toContain(
      'Price-risk items are advisory and do not claim exact margin or loss.',
    );
  });

  it.each(['post', 'patch', 'delete'] as const)(
    'does not expose %s mutations on action items',
    async (method) => {
      const cookies = await loginAsRole(app, 'ADMIN');

      await request(app.getHttpServer())
        [method]('/dashboard/action-items')
        .set('Cookie', cookies)
        .expect(404)
        .expect(({ body }: { body: { message: string } }) => {
          expect(body.message).toBe(
            `Cannot ${method.toUpperCase()} /dashboard/action-items`,
          );
        });
    },
  );
});

async function seedPriceRiskActionItem(prisma: PrismaService) {
  await prisma.inventoryItem.upsert({
    where: { id: 'e2e-action-price-risk-no-price' },
    update: {
      name: 'E2E low-stock item without price',
      minimumStock: 1,
      defaultSalePrice: null,
      isActive: true,
      updatedAt: new Date('2026-05-10T00:00:00.000Z'),
    },
    create: {
      id: 'e2e-action-price-risk-no-price',
      name: 'E2E low-stock item without price',
      itemType: InventoryItemType.DEMAND_PURCHASED,
      condition: InventoryCondition.NEW,
      brand: 'E2E',
      reference: 'PRICE-RISK-NO-QUOTE',
      identifier: 'E2E-PRICE-RISK-NO-QUOTE',
      notes:
        'E2E fixture: no defaultSalePrice and no active quotes as of action range.',
      minimumStock: 1,
      defaultSalePrice: null,
      isActive: true,
      createdAt: new Date('2026-05-10T00:00:00.000Z'),
      updatedAt: new Date('2026-05-10T00:00:00.000Z'),
    },
  });
}

function expectCategoryItem(
  body: DashboardActionItemsResponse,
  category: string,
  expected: {
    entityId: string;
    dueAt: string | null;
    amount: number | null;
    dateBasis: string;
  },
) {
  const item = body.items.find(
    (candidate) =>
      candidate.category === category &&
      candidate.entity.id === expected.entityId,
  );

  expect(item).toMatchObject({
    category,
    entity: { id: expected.entityId },
    dueAt: expected.dueAt,
    amount: expected.amount,
    dateBasis: expected.dateBasis,
  });

  return item as NonNullable<typeof item>;
}
