import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createE2EApp } from '../support/create-e2e-app';
import { loginAsRole } from '../support/auth-e2e';

type PayrollLineResponse = { id: string };

type PayrollResponse = {
  id: string;
  year: number;
  month: number;
  status: 'DRAFT' | 'FINALIZED';
  grandTotal: number;
  finalizedAt: string | null;
  lines: PayrollLineResponse[];
};

type PayrollListResponse = {
  data: Array<{ id: string }>;
};

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

    const generatedPayroll = generateResponse.body as PayrollResponse;

    expect(generatedPayroll).toMatchObject({
      year: 2026,
      month: 5,
      status: 'DRAFT',
    });
    expect(generatedPayroll.lines.length).toBeGreaterThan(0);

    const payrollId = generatedPayroll.id;
    const firstGrandTotal = generatedPayroll.grandTotal;

    const regenerateResponse = await request(app.getHttpServer())
      .post('/employee-monthly-payroll/generate')
      .set('Cookie', adminCookies)
      .send({ year: 2026, month: 5 })
      .expect(201);

    const regeneratedPayroll = regenerateResponse.body as PayrollResponse;

    expect(regeneratedPayroll.id).toBe(payrollId);
    expect(regeneratedPayroll.grandTotal).toBe(firstGrandTotal);

    await request(app.getHttpServer())
      .get('/employee-monthly-payroll?page=1&limit=10&year=2026')
      .set('Cookie', salesCookies)
      .expect(200)
      .expect(({ body }) => {
        const responseBody = body as PayrollListResponse;

        expect(responseBody.data.some((item) => item.id === payrollId)).toBe(
          true,
        );
      });

    await request(app.getHttpServer())
      .get(`/employee-monthly-payroll/${payrollId}`)
      .set('Cookie', salesCookies)
      .expect(200)
      .expect(({ body }) => {
        const responseBody = body as PayrollResponse;

        expect(responseBody.id).toBe(payrollId);
        expect(responseBody.lines.length).toBeGreaterThan(0);
      });

    await request(app.getHttpServer())
      .post(`/employee-monthly-payroll/${payrollId}/finalize`)
      .set('Cookie', adminCookies)
      .expect(200)
      .expect(({ body }) => {
        const responseBody = body as PayrollResponse;

        expect(responseBody.status).toBe('FINALIZED');
        expect(responseBody.finalizedAt).toBeTruthy();
      });

    await request(app.getHttpServer())
      .post('/employee-monthly-payroll/generate')
      .set('Cookie', adminCookies)
      .send({ year: 2026, month: 5 })
      .expect(409);
  });
});
