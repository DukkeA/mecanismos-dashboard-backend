import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createE2EApp } from '../support/create-e2e-app';
import { loginAsRole } from '../support/auth-e2e';

type PricingLaborSettingsResponse = {
  currencyCode: string;
  monthlyWorkingHours: number;
  defaultLaborHourlyRate: number;
  saleContingencyPct: number;
  workshopContingencyPct: number;
  diagnosticContingencyPct: number;
  minimumMarkupPct: number;
  recommendedMarkupPct: number;
  highMarkupPct: number;
  updatedAt: string;
};

type PricingLaborSettingsAuditEntryResponse = {
  id: string;
  actorUserId: string;
  changedFields: string[];
  beforeValues: Record<string, string | number>;
  afterValues: Record<string, string | number>;
  createdAt: string;
};

type PricingLaborSettingsHistoryResponse = {
  data: PricingLaborSettingsAuditEntryResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
};

describe('AppSettingsController (real db e2e)', () => {
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

  it('allows ADMIN/SALES reads and rejects unauthenticated or mechanic access', async () => {
    await request(app.getHttpServer())
      .get('/app-settings/pricing-labor')
      .expect(401);

    const mechanicCookies = await loginAsRole(app, 'MECHANIC');

    await request(app.getHttpServer())
      .get('/app-settings/pricing-labor')
      .set('Cookie', mechanicCookies)
      .expect(403);

    const salesCookies = await loginAsRole(app, 'SALES');

    await request(app.getHttpServer())
      .get('/app-settings/pricing-labor')
      .set('Cookie', salesCookies)
      .expect(200)
      .expect(({ body }: { body: PricingLaborSettingsResponse }) => {
        expect(body.currencyCode).toBe('COP');
        expect(body.defaultLaborHourlyRate).toBe(50000);
        expect(body.recommendedMarkupPct).toBe(35);
      });
  });

  it('updates current pricing/labor settings for admins and re-reads the persisted singleton', async () => {
    const adminCookies = await loginAsRole(app, 'ADMIN');
    const salesCookies = await loginAsRole(app, 'SALES');

    await request(app.getHttpServer())
      .patch('/app-settings/pricing-labor')
      .set('Cookie', adminCookies)
      .send({
        currencyCode: 'USD',
        monthlyWorkingHours: 200,
        defaultLaborHourlyRate: 65000,
        saleContingencyPct: 7,
        workshopContingencyPct: 12,
        diagnosticContingencyPct: 25,
        minimumMarkupPct: 18,
        recommendedMarkupPct: 32,
        highMarkupPct: 48,
      })
      .expect(200)
      .expect(({ body }: { body: PricingLaborSettingsResponse }) => {
        expect(body.currencyCode).toBe('USD');
        expect(body.monthlyWorkingHours).toBe(200);
        expect(body.defaultLaborHourlyRate).toBe(65000);
        expect(body.diagnosticContingencyPct).toBe(25);
      });

    await request(app.getHttpServer())
      .get('/app-settings/pricing-labor')
      .set('Cookie', salesCookies)
      .expect(200)
      .expect(({ body }: { body: PricingLaborSettingsResponse }) => {
        expect(body.currencyCode).toBe('USD');
        expect(body.defaultLaborHourlyRate).toBe(65000);
        expect(body.highMarkupPct).toBe(48);
      });
  });

  it('creates audit history for changed admin updates and protects paginated history reads', async () => {
    const adminCookies = await loginAsRole(app, 'ADMIN');
    const salesCookies = await loginAsRole(app, 'SALES');
    const mechanicCookies = await loginAsRole(app, 'MECHANIC');

    const beforeSettingsResponse = await request(app.getHttpServer())
      .get('/app-settings/pricing-labor')
      .set('Cookie', adminCookies)
      .expect(200);
    const beforeSettings =
      beforeSettingsResponse.body as PricingLaborSettingsResponse;

    const beforeHistoryResponse = await request(app.getHttpServer())
      .get('/app-settings/pricing-labor/history?page=1&limit=10')
      .set('Cookie', adminCookies)
      .expect(200);
    const beforeHistory =
      beforeHistoryResponse.body as PricingLaborSettingsHistoryResponse;

    const nextCurrencyCode =
      beforeSettings.currencyCode === 'COP' ? 'USD' : 'COP';
    const nextLaborRate =
      beforeSettings.defaultLaborHourlyRate === 50000 ? 65000 : 50000;

    await request(app.getHttpServer())
      .patch('/app-settings/pricing-labor')
      .set('Cookie', adminCookies)
      .send({
        currencyCode: nextCurrencyCode,
        defaultLaborHourlyRate: nextLaborRate,
      })
      .expect(200)
      .expect(({ body }: { body: PricingLaborSettingsResponse }) => {
        expect(body.currencyCode).toBe(nextCurrencyCode);
        expect(body.defaultLaborHourlyRate).toBe(nextLaborRate);
      });

    await request(app.getHttpServer())
      .get('/app-settings/pricing-labor/history?page=1&limit=10')
      .expect(401);

    await request(app.getHttpServer())
      .get('/app-settings/pricing-labor/history?page=1&limit=10')
      .set('Cookie', mechanicCookies)
      .expect(403);

    await request(app.getHttpServer())
      .get('/app-settings/pricing-labor/history?page=1&limit=10')
      .set('Cookie', salesCookies)
      .expect(200)
      .expect(({ body }: { body: PricingLaborSettingsHistoryResponse }) => {
        expect(body.meta.page).toBe(1);
        expect(body.meta.limit).toBe(10);
        expect(body.meta.total).toBe(beforeHistory.meta.total + 1);
        expect(body.data.length).toBeGreaterThan(0);
        expect(body.data[0]).toMatchObject({
          actorUserId: 'seed-user-admin',
          changedFields: ['currencyCode', 'defaultLaborHourlyRate'],
          beforeValues: {
            currencyCode: beforeSettings.currencyCode,
            defaultLaborHourlyRate: beforeSettings.defaultLaborHourlyRate,
          },
          afterValues: {
            currencyCode: nextCurrencyCode,
            defaultLaborHourlyRate: nextLaborRate,
          },
        });
      });
  });

  it('rejects invalid or unauthorized updates without mutating persisted settings', async () => {
    const adminCookies = await loginAsRole(app, 'ADMIN');
    const salesCookies = await loginAsRole(app, 'SALES');

    const beforeResponse = await request(app.getHttpServer())
      .get('/app-settings/pricing-labor')
      .set('Cookie', adminCookies)
      .expect(200);
    const before = beforeResponse.body as PricingLaborSettingsResponse;
    const beforeHistoryResponse = await request(app.getHttpServer())
      .get('/app-settings/pricing-labor/history?page=1&limit=10')
      .set('Cookie', adminCookies)
      .expect(200);
    const beforeHistory =
      beforeHistoryResponse.body as PricingLaborSettingsHistoryResponse;

    await request(app.getHttpServer())
      .patch('/app-settings/pricing-labor')
      .set('Cookie', salesCookies)
      .send({ defaultLaborHourlyRate: 99000 })
      .expect(403);

    await request(app.getHttpServer())
      .patch('/app-settings/pricing-labor')
      .set('Cookie', adminCookies)
      .send({
        currencyCode: 'US',
        monthlyWorkingHours: 0,
        defaultLaborHourlyRate: -1,
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/app-settings/pricing-labor')
      .set('Cookie', adminCookies)
      .send({})
      .expect(400);

    await request(app.getHttpServer())
      .patch('/app-settings/pricing-labor')
      .set('Cookie', adminCookies)
      .send({
        currencyCode: before.currencyCode,
        defaultLaborHourlyRate: before.defaultLaborHourlyRate,
      })
      .expect(400);

    await request(app.getHttpServer())
      .get('/app-settings/pricing-labor')
      .set('Cookie', adminCookies)
      .expect(200)
      .expect(({ body }: { body: PricingLaborSettingsResponse }) => {
        expect(body.currencyCode).toBe(before.currencyCode);
        expect(body.monthlyWorkingHours).toBe(before.monthlyWorkingHours);
        expect(body.defaultLaborHourlyRate).toBe(before.defaultLaborHourlyRate);
      });

    await request(app.getHttpServer())
      .get('/app-settings/pricing-labor/history?page=1&limit=10')
      .set('Cookie', adminCookies)
      .expect(200)
      .expect(({ body }: { body: PricingLaborSettingsHistoryResponse }) => {
        expect(body.meta.total).toBe(beforeHistory.meta.total);
      });
  });
});
