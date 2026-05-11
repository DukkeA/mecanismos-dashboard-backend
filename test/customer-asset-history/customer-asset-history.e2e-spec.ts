import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createE2EApp } from '../support/create-e2e-app';
import { loginAsRole } from '../support/auth-e2e';

type HistoryRole = 'ADMIN' | 'SALES';

type HistoryResponse = {
  subject: {
    id: string;
    scope: 'CUSTOMER' | 'VEHICLE' | 'COMPONENT';
    label: string;
    componentTypeName?: string | null;
  };
  relatedAssets: {
    customer?: { id: string; label: string } | null;
    vehicle?: { id: string; label: string } | null;
    vehicles: Array<{ id: string; label: string }>;
    components: Array<{ id: string; label: string }>;
  };
  summary: {
    totalWorkOrders: number;
    unknownPayableCount: number;
    payableAmount: number;
    paidTotal: number;
    balance: number;
    actualCostTotal: number;
  };
  data: Array<{
    workOrderId: string;
    paymentStatus: string;
    assetLabel: string;
    payableAmount: number | null;
    paidTotal: number;
    balance: number | null;
    actualCostTotal: number;
    links: {
      workOrderId: string;
      customerId: string;
      vehicleId: string | null;
      componentId: string | null;
    };
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

describe('CustomerAssetHistoryController (real db e2e)', () => {
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

  it.each<HistoryRole>(['ADMIN', 'SALES'])(
    'returns concise customer history for %s users',
    async (role) => {
      const cookies = await loginAsRole(app, role);

      await request(app.getHttpServer())
        .get('/customer-asset-history/customers/seed-customer-acme-industrial')
        .set('Cookie', cookies)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(({ body }: { body: HistoryResponse }) => {
          expect(body.subject).toMatchObject({
            id: 'seed-customer-acme-industrial',
            scope: 'CUSTOMER',
            label: 'Acme Industrial SAS',
          });
          expect(body.relatedAssets.vehicles).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                id: 'seed-vehicle-acme-foton-aumark',
                label: 'Foton Aumark BJ1049 · ABC123',
              }),
            ]),
          );
          expect(body.relatedAssets.components).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                id: 'seed-component-acme-inyector',
                label: 'Bosch 0445120231 · INY-ACME-001',
              }),
            ]),
          );
          expect(body.summary).toEqual({
            totalWorkOrders: 2,
            unknownPayableCount: 1,
            payableAmount: 620000,
            paidTotal: 650000,
            balance: 0,
            actualCostTotal: 252000,
          });
          expect(body.meta).toEqual({
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
          });
          expect(body.data).toHaveLength(2);
          expect(body.data[0]).toMatchObject({
            workOrderId: 'seed-work-order-workshop-unknown-payable',
            assetLabel: 'Bosch 0445120231 · INY-ACME-001',
            payableAmount: null,
            paidTotal: 30000,
            balance: null,
            actualCostTotal: 70000,
            links: {
              workOrderId: 'seed-work-order-workshop-unknown-payable',
              customerId: 'seed-customer-acme-industrial',
              vehicleId: 'seed-vehicle-acme-foton-aumark',
              componentId: 'seed-component-acme-inyector',
            },
          });
        });
    },
  );

  it('supports vehicle pagination and estimated-collection filters with stable ordering', async () => {
    const cookies = await loginAsRole(app, 'ADMIN');

    await request(app.getHttpServer())
      .get('/customer-asset-history/vehicles/seed-vehicle-acme-foton-aumark')
      .query({
        page: 1,
        limit: 1,
        dateField: 'estimatedCollectionAt',
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-05-31T23:59:59.000Z',
      })
      .set('Cookie', cookies)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(({ body }: { body: HistoryResponse }) => {
        expect(body.subject).toMatchObject({
          id: 'seed-vehicle-acme-foton-aumark',
          scope: 'VEHICLE',
          label: 'Foton Aumark BJ1049 · ABC123',
        });
        expect(body.relatedAssets.customer).toEqual({
          id: 'seed-customer-acme-industrial',
          label: 'Acme Industrial SAS',
        });
        expect(body.meta).toEqual({
          page: 1,
          limit: 1,
          total: 2,
          totalPages: 2,
        });
        expect(body.data).toHaveLength(1);
        expect(body.data[0]?.workOrderId).toBe(
          'seed-work-order-workshop-unknown-payable',
        );
      });
  });

  it('filters component history by completed orders only', async () => {
    const cookies = await loginAsRole(app, 'SALES');

    await request(app.getHttpServer())
      .get('/customer-asset-history/components/seed-component-acme-inyector')
      .query({
        dateField: 'completedAt',
        dateFrom: '2026-05-09T00:00:00.000Z',
        dateTo: '2026-05-09T23:59:59.999Z',
        status: 'COMPLETED',
      })
      .set('Cookie', cookies)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(({ body }: { body: HistoryResponse }) => {
        expect(body.subject).toMatchObject({
          id: 'seed-component-acme-inyector',
          scope: 'COMPONENT',
          label: 'Bosch 0445120231 · INY-ACME-001',
          componentTypeName: 'Inyector',
        });
        expect(body.relatedAssets.vehicle).toEqual({
          id: 'seed-vehicle-acme-foton-aumark',
          label: 'Foton Aumark BJ1049 · ABC123',
        });
        expect(body.summary).toEqual({
          totalWorkOrders: 1,
          unknownPayableCount: 0,
          payableAmount: 620000,
          paidTotal: 620000,
          balance: 0,
          actualCostTotal: 182000,
        });
        expect(body.data).toEqual([
          expect.objectContaining({
            workOrderId: 'seed-work-order-workshop-injector-repair',
            paymentStatus: 'PAID',
          }),
        ]);
      });
  });

  it('rejects invalid history queries before running broad reads', async () => {
    const cookies = await loginAsRole(app, 'ADMIN');

    await request(app.getHttpServer())
      .get('/customer-asset-history/customers/seed-customer-acme-industrial')
      .query({
        page: 0,
        limit: 101,
        dateField: 'paidAt',
      })
      .set('Cookie', cookies)
      .expect(400)
      .expect('Content-Type', /json/)
      .expect(({ body }: { body: { message: string[] } }) => {
        expect(body.message).toEqual(
          expect.arrayContaining([
            'page must not be less than 1',
            'limit must not be greater than 100',
            'dateField must be one of the following values: createdAt, completedAt, estimatedCollectionAt',
          ]),
        );
      });
  });

  it('returns not found, blocks unauthorized roles, and keeps mutations unavailable', async () => {
    await request(app.getHttpServer())
      .get('/customer-asset-history/customers/seed-customer-acme-industrial')
      .expect(401);

    const mechanicCookies = await loginAsRole(app, 'MECHANIC');
    await request(app.getHttpServer())
      .get('/customer-asset-history/customers/seed-customer-acme-industrial')
      .set('Cookie', mechanicCookies)
      .expect(403);

    const adminCookies = await loginAsRole(app, 'ADMIN');
    await request(app.getHttpServer())
      .get('/customer-asset-history/customers/missing-customer')
      .set('Cookie', adminCookies)
      .expect(404);

    await request(app.getHttpServer())
      .post('/customer-asset-history/customers/seed-customer-acme-industrial')
      .set('Cookie', adminCookies)
      .send({ notes: 'forbidden mutation' })
      .expect(404);
  });
});
