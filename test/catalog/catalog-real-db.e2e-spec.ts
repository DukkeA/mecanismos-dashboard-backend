import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createE2EApp } from '../support/create-e2e-app';
import { loginAsRole } from '../support/auth-e2e';

type SupplierListResponse = {
  data: Array<{ name: string }>;
  meta: {
    page: number;
    limit: number;
  };
};

type InventoryItemResponse = {
  name: string;
  currentStock: number;
};

type SupplierQuoteLookupResponse = {
  latestBySupplier: unknown[];
  history: unknown[];
};

describe('Seeded catalog reads (real db e2e)', () => {
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

  it('lists seeded suppliers for SALES users through the real auth + prisma flow', async () => {
    const cookies = await loginAsRole(app, 'SALES');

    await request(app.getHttpServer())
      .get(
        '/suppliers?page=1&limit=10&search=repuestos&type=COMPANY&isActive=true',
      )
      .set('Cookie', cookies)
      .expect(200)
      .expect(({ body }: { body: SupplierListResponse }) => {
        expect(body.meta).toMatchObject({
          page: 1,
          limit: 10,
        });
        expect(body.data.length).toBeGreaterThan(0);
        expect(body.data[0].name).toContain('Repuestos');
      });
  });

  it('reads seeded inventory and supplier quote lookups with derived stock', async () => {
    const cookies = await loginAsRole(app, 'ADMIN');

    await request(app.getHttpServer())
      .get('/inventory-items/seed-inventory-item-bosch-inyector')
      .set('Cookie', cookies)
      .expect(200)
      .expect(({ body }: { body: InventoryItemResponse }) => {
        expect(body.name).toBe('Inyector Bosch 0445120231');
        expect(body.currentStock).toBe(3);
      });

    await request(app.getHttpServer())
      .get(
        '/inventory-items/seed-inventory-item-bosch-inyector/supplier-quotes',
      )
      .set('Cookie', cookies)
      .expect(200)
      .expect(({ body }: { body: SupplierQuoteLookupResponse }) => {
        expect(body.latestBySupplier.length).toBeGreaterThan(0);
        expect(body.history.length).toBeGreaterThan(0);
      });
  });
});
