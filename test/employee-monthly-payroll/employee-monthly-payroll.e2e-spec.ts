import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createE2EApp } from '../support/create-e2e-app';
import { loginAsRole } from '../support/auth-e2e';

describe('EmployeeMonthlyPayrollController (real db e2e)', () => {
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

  it('rejects unauthenticated payroll listing and forbids mechanic mutations', async () => {
    await request(app.getHttpServer())
      .get('/employee-monthly-payroll')
      .expect(401);

    const mechanicCookies = await loginAsRole(app, 'MECHANIC');

    await request(app.getHttpServer())
      .post('/employee-monthly-payroll/generate')
      .set('Cookie', mechanicCookies)
      .send({ year: 2026, month: 5 })
      .expect(403);
  });

  it('lists, generates, regenerates, details, finalizes, and then rejects finalized regeneration', async () => {
    const adminCookies = await loginAsRole(app, 'ADMIN');
    const salesCookies = await loginAsRole(app, 'SALES');

    const generateResponse = await request(app.getHttpServer())
      .post('/employee-monthly-payroll/generate')
      .set('Cookie', adminCookies)
      .send({ year: 2026, month: 5 })
      .expect(201);

    expect(generateResponse.body).toMatchObject({
      year: 2026,
      month: 5,
      status: 'DRAFT',
    });
    expect(generateResponse.body.lines.length).toBeGreaterThan(0);

    const payrollId = generateResponse.body.id as string;
    const firstGrandTotal = generateResponse.body.grandTotal as number;

    const regenerateResponse = await request(app.getHttpServer())
      .post('/employee-monthly-payroll/generate')
      .set('Cookie', adminCookies)
      .send({ year: 2026, month: 5 })
      .expect(201);

    expect(regenerateResponse.body.id).toBe(payrollId);
    expect(regenerateResponse.body.grandTotal).toBe(firstGrandTotal);

    await request(app.getHttpServer())
      .get('/employee-monthly-payroll?page=1&limit=10&year=2026')
      .set('Cookie', salesCookies)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.some((item: { id: string }) => item.id === payrollId)).toBe(
          true,
        );
      });

    await request(app.getHttpServer())
      .get(`/employee-monthly-payroll/${payrollId}`)
      .set('Cookie', salesCookies)
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(payrollId);
        expect(body.lines.length).toBeGreaterThan(0);
      });

    await request(app.getHttpServer())
      .post(`/employee-monthly-payroll/${payrollId}/finalize`)
      .set('Cookie', adminCookies)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('FINALIZED');
        expect(body.finalizedAt).toBeTruthy();
      });

    await request(app.getHttpServer())
      .post('/employee-monthly-payroll/generate')
      .set('Cookie', adminCookies)
      .send({ year: 2026, month: 5 })
      .expect(409);
  });
});
