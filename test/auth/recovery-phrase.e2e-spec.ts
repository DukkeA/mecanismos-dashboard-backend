import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { hash } from 'bcrypt';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RecoveryPhraseGenerator } from '../../src/auth/recovery-phrase.generator';
import { createE2EApp } from '../support/create-e2e-app';
import { loginAsRole } from '../support/auth-e2e';

type AdminUserResponseBody = {
  id: string;
  email: string;
};

type RecoveryPhraseGenerateBody = {
  phrase: string;
  words: string[];
  generatedAt: string;
};

type RecoveryPhraseStatusBody = {
  enabled: boolean;
  generatedAt: string | null;
  consumedAt: string | null;
};

describe('Auth recovery phrase (real db e2e)', () => {
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

  it('generates, hides, consumes, and rejects reuse of a recovery phrase', async () => {
    const adminCookies = await loginAsRole(app, 'ADMIN');
    const user = await createAdminUser(
      app,
      adminCookies,
      'recovery-flow@mecanismos.test',
      'RecoveryFlow123!',
    );
    const userCookies = await login(app, user.email, 'RecoveryFlow123!');

    const generateResponse = await request(app.getHttpServer())
      .post('/auth/recovery-phrase/generate')
      .set('Cookie', userCookies)
      .send({ currentPassword: 'RecoveryFlow123!' })
      .expect(200);
    const generated = generateResponse.body as RecoveryPhraseGenerateBody;

    expect(generated.words).toHaveLength(8);
    expect(generated.phrase.split(' ')).toEqual(generated.words);
    expect(generated.phrase).toMatch(/^[a-z]+(?: [a-z]+){7}$/);

    await request(app.getHttpServer())
      .get('/auth/recovery-phrase/status')
      .set('Cookie', userCookies)
      .expect(200)
      .expect(({ body }: { body: RecoveryPhraseStatusBody }) => {
        expect(body.enabled).toBe(true);
        expect(body.generatedAt).toBe(generated.generatedAt);
        expect(body.consumedAt).toBeNull();
        expect(JSON.stringify(body)).not.toContain(generated.phrase);
        expect(JSON.stringify(body)).not.toContain('recoveryPhraseHash');
      });

    await request(app.getHttpServer())
      .post('/auth/recovery-phrase/recover')
      .send({
        email: `  ${user.email.toUpperCase()}  `,
        recoveryPhrase: generated.phrase.toUpperCase(),
        newPassword: 'Recovered123!',
      })
      .expect(200)
      .expect({ success: true });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'RecoveryFlow123!' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'Recovered123!' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', userCookies)
      .expect(401);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', userCookies)
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/recovery-phrase/recover')
      .send({
        email: user.email,
        recoveryPhrase: generated.phrase,
        newPassword: 'Reused123!',
      })
      .expect(401)
      .expect(({ body }: { body: { message: string } }) => {
        expect(body.message).toBe('Recovery failed');
      });
  });

  it('allows a sales user to generate and recover with their own recovery phrase', async () => {
    const adminCookies = await loginAsRole(app, 'ADMIN');
    const user = await createAdminUser(
      app,
      adminCookies,
      'sales-recovery-flow@mecanismos.test',
      'SalesRecovery123!',
      'SALES',
    );
    const userCookies = await login(app, user.email, 'SalesRecovery123!');

    const generateResponse = await request(app.getHttpServer())
      .post('/auth/recovery-phrase/generate')
      .set('Cookie', userCookies)
      .send({ currentPassword: 'SalesRecovery123!' })
      .expect(200);
    const generated = generateResponse.body as RecoveryPhraseGenerateBody;

    await request(app.getHttpServer())
      .get('/auth/recovery-phrase/status')
      .set('Cookie', userCookies)
      .expect(200)
      .expect(({ body }: { body: RecoveryPhraseStatusBody }) => {
        expect(body.enabled).toBe(true);
        expect(body.generatedAt).toBe(generated.generatedAt);
        expect(body.consumedAt).toBeNull();
      });

    await request(app.getHttpServer())
      .post('/auth/recovery-phrase/recover')
      .send({
        email: user.email,
        recoveryPhrase: generated.phrase,
        newPassword: 'SalesRecovered123!',
      })
      .expect(200)
      .expect({ success: true });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'SalesRecovered123!' })
      .expect(200);
  });

  it('rate-limits repeated failed recovery attempts and clears the limiter after success', async () => {
    const adminCookies = await loginAsRole(app, 'ADMIN');
    const user = await createAdminUser(
      app,
      adminCookies,
      'rate-limit-recovery@mecanismos.test',
      'RateLimitRecovery123!',
    );
    const userCookies = await login(app, user.email, 'RateLimitRecovery123!');
    const generateResponse = await request(app.getHttpServer())
      .post('/auth/recovery-phrase/generate')
      .set('Cookie', userCookies)
      .send({ currentPassword: 'RateLimitRecovery123!' })
      .expect(200);
    const generated = generateResponse.body as RecoveryPhraseGenerateBody;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/auth/recovery-phrase/recover')
        .send({
          email: user.email,
          recoveryPhrase: generateMismatchedRecoveryPhrase(generated.phrase),
          newPassword: `WrongAttempt${attempt}123!`,
        })
        .expect(401);
    }

    await request(app.getHttpServer())
      .post('/auth/recovery-phrase/recover')
      .send({
        email: user.email,
        recoveryPhrase: generateMismatchedRecoveryPhrase(generated.phrase),
        newPassword: 'LockedOut123!',
      })
      .expect(429);

    const secondUser = await createAdminUser(
      app,
      adminCookies,
      'rate-limit-success@mecanismos.test',
      'RateLimitSuccess123!',
    );
    const secondCookies = await login(
      app,
      secondUser.email,
      'RateLimitSuccess123!',
    );
    const secondGenerateResponse = await request(app.getHttpServer())
      .post('/auth/recovery-phrase/generate')
      .set('Cookie', secondCookies)
      .send({ currentPassword: 'RateLimitSuccess123!' })
      .expect(200);
    const secondGenerated =
      secondGenerateResponse.body as RecoveryPhraseGenerateBody;

    await request(app.getHttpServer())
      .post('/auth/recovery-phrase/recover')
      .send({
        email: secondUser.email,
        recoveryPhrase: generateMismatchedRecoveryPhrase(
          secondGenerated.phrase,
        ),
        newPassword: 'FirstFailure123!',
      })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/recovery-phrase/recover')
      .send({
        email: secondUser.email,
        recoveryPhrase: secondGenerated.phrase,
        newPassword: 'RecoveredAfterFailure123!',
      })
      .expect(200);
  });

  it('rejects wrong phrases generically and admin reset clears old phrases', async () => {
    const adminCookies = await loginAsRole(app, 'ADMIN');
    const user = await createAdminUser(
      app,
      adminCookies,
      'recovery-reset@mecanismos.test',
      'RecoveryReset123!',
    );
    const userCookies = await login(app, user.email, 'RecoveryReset123!');

    const generateResponse = await request(app.getHttpServer())
      .post('/auth/recovery-phrase/generate')
      .set('Cookie', userCookies)
      .send({ currentPassword: 'RecoveryReset123!' })
      .expect(200);
    const generated = generateResponse.body as RecoveryPhraseGenerateBody;

    await request(app.getHttpServer())
      .post('/auth/recovery-phrase/recover')
      .send({
        email: user.email,
        recoveryPhrase: generateMismatchedRecoveryPhrase(generated.phrase),
        newPassword: 'WrongPhrase123!',
      })
      .expect(401)
      .expect(({ body }: { body: { message: string } }) => {
        expect(body.message).toBe('Recovery failed');
      });

    await request(app.getHttpServer())
      .post(`/admin/users/${user.id}/reset-password`)
      .set('Cookie', adminCookies)
      .send({ temporaryPassword: 'AdminReset123!' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/recovery-phrase/recover')
      .send({
        email: user.email,
        recoveryPhrase: generated.phrase,
        newPassword: 'ShouldNotWork123!',
      })
      .expect(401)
      .expect(({ body }: { body: { message: string } }) => {
        expect(body.message).toBe('Recovery failed');
      });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'AdminReset123!' })
      .expect(200);
  });

  it('rejects recovery for inactive users generically', async () => {
    const adminCookies = await loginAsRole(app, 'ADMIN');
    const generatedPhrase = new RecoveryPhraseGenerator({
      randomInt: () => 0,
    }).generate();

    const inactiveAdmin = await createAdminUser(
      app,
      adminCookies,
      'inactive-recovery@mecanismos.test',
      'InactiveRecovery123!',
    );
    await prisma.account.update({
      where: { userId: inactiveAdmin.id },
      data: {
        recoveryPhraseHash: await hash(generatedPhrase, 12),
        recoveryPhraseGeneratedAt: new Date(),
        recoveryPhraseConsumedAt: null,
      },
    });
    await request(app.getHttpServer())
      .patch(`/admin/users/${inactiveAdmin.id}`)
      .set('Cookie', adminCookies)
      .send({ isActive: false })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/recovery-phrase/recover')
      .send({
        email: inactiveAdmin.email,
        recoveryPhrase: generatedPhrase,
        newPassword: 'ShouldNotWork123!',
      })
      .expect(401)
      .expect(({ body }: { body: { message: string } }) => {
        expect(body.message).toBe('Recovery failed');
      });
  });
});

async function createAdminUser(
  app: INestApplication<App>,
  adminCookies: string[],
  email: string,
  temporaryPassword: string,
  role: 'ADMIN' | 'SALES' = 'ADMIN',
) {
  const response = await request(app.getHttpServer())
    .post('/admin/users')
    .set('Cookie', adminCookies)
    .send({
      email,
      name: 'Recovery Admin',
      role,
      temporaryPassword,
    })
    .expect(201);

  return response.body as AdminUserResponseBody;
}

async function login(
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

function generateMismatchedRecoveryPhrase(phraseToAvoid: string): string {
  const generatedPhrase = new RecoveryPhraseGenerator({
    randomInt: (max) => Math.min(1, max - 1),
  }).generate();

  if (generatedPhrase !== phraseToAvoid) {
    return generatedPhrase;
  }

  return new RecoveryPhraseGenerator({
    randomInt: (max) => Math.min(2, max - 1),
  }).generate();
}
