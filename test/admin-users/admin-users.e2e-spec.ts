import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createE2EApp } from '../support/create-e2e-app';
import { loginAsRole } from '../support/auth-e2e';

type AdminUserResponseBody = {
  id: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
  temporaryPassword?: string;
};

type AdminUsersListResponseBody = {
  data: Array<Pick<AdminUserResponseBody, 'email' | 'mustChangePassword'>>;
};

describe('AdminUsersController (real db e2e)', () => {
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

  afterEach(async () => {
    await prisma.session.deleteMany({
      where: { userId: { startsWith: 'test-admin-user-' } },
    });
    await prisma.account.deleteMany({
      where: { userId: { startsWith: 'test-admin-user-' } },
    });
    await prisma.user.deleteMany({
      where: { id: { startsWith: 'test-admin-user-' } },
    });
  });

  it('rejects non-admin requests', async () => {
    const salesCookies = await loginAsRole(app, 'SALES');

    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Cookie', salesCookies)
      .expect(403);
  });

  it('creates users, rejects duplicate emails, and keeps the temporary password one-time only', async () => {
    const adminCookies = await loginAsRole(app, 'ADMIN');

    const createResponse = await request(app.getHttpServer())
      .post('/admin/users')
      .set('Cookie', adminCookies)
      .send({
        email: 'nuevo-admin@mecanismos.test',
        name: 'Nuevo Admin',
        role: 'SALES',
        temporaryPassword: 'Temp1234!',
      })
      .expect(201);

    const createBody = createResponse.body as AdminUserResponseBody;

    expect(createBody).toMatchObject({
      email: 'nuevo-admin@mecanismos.test',
      role: 'SALES',
      mustChangePassword: true,
      temporaryPassword: 'Temp1234!',
    });

    await request(app.getHttpServer())
      .post('/admin/users')
      .set('Cookie', adminCookies)
      .send({
        email: 'NUEVO-ADMIN@MECANISMOS.TEST',
        name: 'Duplicado',
        role: 'SALES',
        temporaryPassword: 'Temp1234!',
      })
      .expect(409);

    const listResponse = await request(app.getHttpServer())
      .get('/admin/users')
      .query({ search: 'nuevo-admin' })
      .set('Cookie', adminCookies)
      .expect(200);

    const listBody = listResponse.body as AdminUsersListResponseBody;

    expect(listBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: 'nuevo-admin@mecanismos.test',
          mustChangePassword: true,
        }),
      ]),
    );
    expect(JSON.stringify(listResponse.body)).not.toContain('Temp1234!');
    expect(JSON.stringify(listResponse.body)).not.toContain('passwordHash');
  });

  it('blocks self-lockout and revokes sessions after deactivation and reset', async () => {
    const adminCookies = await loginAsRole(app, 'ADMIN');

    await request(app.getHttpServer())
      .patch('/admin/users/seed-user-admin')
      .set('Cookie', adminCookies)
      .send({ isActive: false })
      .expect(400);

    const createResponse = await request(app.getHttpServer())
      .post('/admin/users')
      .set('Cookie', adminCookies)
      .send({
        email: 'desactivar@mecanismos.test',
        name: 'Desactivar Usuario',
        role: 'MECHANIC',
        temporaryPassword: 'Temp1234!',
      })
      .expect(201);

    const createdUserId = (createResponse.body as AdminUserResponseBody).id;
    const userCookies = await loginWithTemporaryPassword(
      app,
      'desactivar@mecanismos.test',
      'Temp1234!',
    );

    await request(app.getHttpServer())
      .post(`/admin/users/${createdUserId}/reset-password`)
      .set('Cookie', adminCookies)
      .send({ temporaryPassword: 'Reset1234!' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', userCookies)
      .expect(401);

    const refreshedCookies = await loginWithTemporaryPassword(
      app,
      'desactivar@mecanismos.test',
      'Reset1234!',
    );

    await request(app.getHttpServer())
      .patch(`/admin/users/${createdUserId}`)
      .set('Cookie', adminCookies)
      .send({ isActive: false })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', refreshedCookies)
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'desactivar@mecanismos.test',
        password: 'Reset1234!',
      })
      .expect(401);
  });
});

async function loginWithTemporaryPassword(
  app: INestApplication<App>,
  email: string,
  password: string,
) {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  const cookies = response.headers['set-cookie'];

  return Array.isArray(cookies) ? cookies : [];
}
