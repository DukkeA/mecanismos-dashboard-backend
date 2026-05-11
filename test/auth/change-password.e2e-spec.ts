import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createE2EApp } from '../support/create-e2e-app';

type ChangePasswordUserBody = {
  email: string;
  mustChangePassword: boolean;
};

describe('Auth change-password (real db e2e)', () => {
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

  it('clears mustChangePassword after a successful password change without leaking hashes or secrets', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@mecanismos.test', password: 'Admin123!' })
      .expect(200);
    const adminCookies = adminLogin.headers[
      'set-cookie'
    ] as unknown as string[];

    const createResponse = await request(app.getHttpServer())
      .post('/admin/users')
      .set('Cookie', adminCookies)
      .send({
        email: 'forzar-cambio@mecanismos.test',
        name: 'Forzar Cambio',
        role: 'SALES',
        temporaryPassword: 'Temp1234!',
      })
      .expect(201);

    const createBody = createResponse.body as ChangePasswordUserBody;

    expect(createBody.mustChangePassword).toBe(true);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'forzar-cambio@mecanismos.test',
        password: 'Temp1234!',
      })
      .expect(200);

    const loginBody = loginResponse.body as ChangePasswordUserBody;

    expect(loginBody.mustChangePassword).toBe(true);

    const userCookies = loginResponse.headers[
      'set-cookie'
    ] as unknown as string[];

    const changeResponse = await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Cookie', userCookies)
      .send({
        currentPassword: 'Temp1234!',
        newPassword: 'NewSecure123!',
      })
      .expect(200);

    const changeBody = changeResponse.body as ChangePasswordUserBody;

    expect(changeBody).toMatchObject({
      email: 'forzar-cambio@mecanismos.test',
      mustChangePassword: false,
    });
    expect(JSON.stringify(changeBody)).not.toContain('Temp1234!');
    expect(JSON.stringify(changeBody)).not.toContain('passwordHash');

    const meResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', userCookies)
      .expect(200);
    expect((meResponse.body as ChangePasswordUserBody).mustChangePassword).toBe(
      false,
    );
  });

  it('rejects change-password when the current password is wrong', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@mecanismos.test', password: 'Admin123!' })
      .expect(200);
    const adminCookies = adminLogin.headers[
      'set-cookie'
    ] as unknown as string[];

    await request(app.getHttpServer())
      .post('/admin/users')
      .set('Cookie', adminCookies)
      .send({
        email: 'wrong-current@mecanismos.test',
        name: 'Wrong Current',
        role: 'SALES',
        temporaryPassword: 'Temp1234!',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'wrong-current@mecanismos.test',
        password: 'Temp1234!',
      })
      .expect(200);
    const userCookies = loginResponse.headers[
      'set-cookie'
    ] as unknown as string[];

    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Cookie', userCookies)
      .send({
        currentPassword: 'Wrong123!',
        newPassword: 'NewSecure123!',
      })
      .expect(401);
  });
});
