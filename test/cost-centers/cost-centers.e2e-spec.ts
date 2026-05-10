import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createE2EApp } from '../support/create-e2e-app';
import { loginAsRole } from '../support/auth-e2e';

type CostCenterRecord = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

type CostCenterListResponse = {
  data: CostCenterRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

describe('CostCentersController (e2e)', () => {
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

  it('rejects unauthenticated cost-center listing', async () => {
    await request(app.getHttpServer()).get('/cost-centers').expect(401);
  });

  it('rejects authenticated MECHANIC cost-center listing', async () => {
    const cookies = await loginAsRole(app, 'MECHANIC');

    await request(app.getHttpServer())
      .get('/cost-centers')
      .set('Cookie', cookies)
      .expect(403);
  });

  it.each(['ADMIN', 'SALES'] as const)(
    'allows authenticated %s users to create, list, get, and update cost centers',
    async (role) => {
      const cookies = await loginAsRole(app, role);
      const runId = `${role.toLowerCase()}-${Date.now()}`;
      const createdResponse = await request(app.getHttpServer())
        .post('/cost-centers')
        .set('Cookie', cookies)
        .send({
          code: `  cc-${runId}  `,
          name: `  Centro ${runId}  `,
        })
        .expect(201);
      const created = readBody<CostCenterRecord>(createdResponse);

      expect(created.code).toBe(`CC-${runId.toUpperCase()}`);
      expect(created.isActive).toBe(true);

      const listResponse = await request(app.getHttpServer())
        .get(
          `/cost-centers?page=1&limit=10&search=${encodeURIComponent(runId)}&isActive=true`,
        )
        .set('Cookie', cookies)
        .expect(200);
      const listBody = readBody<CostCenterListResponse>(listResponse);

      expect(listBody.meta.page).toBe(1);
      expect(listBody.meta.limit).toBe(10);
      expect(listBody.data.some((item) => item.id === created.id)).toBe(true);

      await request(app.getHttpServer())
        .get(`/cost-centers/${created.id}`)
        .set('Cookie', cookies)
        .expect(200)
        .expect(({ body }: { body: CostCenterRecord }) => {
          expect(body.id).toBe(created.id);
          expect(body.code).toBe(created.code);
        });

      await request(app.getHttpServer())
        .patch(`/cost-centers/${created.id}`)
        .set('Cookie', cookies)
        .send({
          code: `  upd-${runId}  `,
          name: `  Centro actualizado ${runId}  `,
          isActive: false,
        })
        .expect(200)
        .expect(({ body }: { body: CostCenterRecord }) => {
          expect(body.code).toBe(`UPD-${runId.toUpperCase()}`);
          expect(body.isActive).toBe(false);
          expect(body.name).toBe(`Centro actualizado ${runId}`);
        });
    },
  );

  it('rejects duplicate canonical cost-center codes with 409', async () => {
    const cookies = await loginAsRole(app, 'ADMIN');
    const runId = `dup-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/cost-centers')
      .set('Cookie', cookies)
      .send({
        code: `CC-${runId}`,
        name: `Centro ${runId}`,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/cost-centers')
      .set('Cookie', cookies)
      .send({
        code: `  cc-${runId.toLowerCase()}  `,
        name: `Centro duplicado ${runId}`,
      })
      .expect(409);
  });

  it('returns 404 for an unknown cost-center id', async () => {
    const cookies = await loginAsRole(app, 'ADMIN');

    await request(app.getHttpServer())
      .get('/cost-centers/missing-cost-center-id')
      .set('Cookie', cookies)
      .expect(404);
  });
});

function readBody<T>(response: request.Response): T {
  return response.body as T;
}
