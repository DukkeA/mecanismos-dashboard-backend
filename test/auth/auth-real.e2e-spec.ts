import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createE2EApp } from '../support/create-e2e-app';
import { loginAsRole } from '../support/auth-e2e';

type AuthUserResponse = {
  email: string;
  role: 'ADMIN' | 'SALES' | 'MECHANIC';
};

describe('AuthController (real db e2e)', () => {
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

  it('logs in with seeded admin credentials and returns the authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@mecanismos.test', password: 'Admin123!' })
      .expect(200);

    expect(response.body).toMatchObject({
      email: 'admin@mecanismos.test',
      role: 'ADMIN',
    });
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('md_access='),
        expect.stringContaining('md_refresh='),
      ]),
    );
  });

  it('reads /auth/me and admin smoke through real auth cookies', async () => {
    const cookies = await loginAsRole(app, 'ADMIN');

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookies)
      .expect(200)
      .expect(({ body }: { body: AuthUserResponse }) => {
        expect(body.email).toBe('admin@mecanismos.test');
        expect(body.role).toBe('ADMIN');
      });

    await request(app.getHttpServer())
      .get('/auth/admin/smoke')
      .set('Cookie', cookies)
      .expect(200)
      .expect({ success: true, role: 'ADMIN' });
  });
});
