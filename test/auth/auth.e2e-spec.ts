jest.mock('../../src/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {
    async $connect() {}
    async $disconnect() {}
  },
}));

import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';

describe('AuthController (e2e)', () => {
  const authService = {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
  };

  let app: INestApplication<App>;

  function readBody(response: request.Response): Record<string, unknown> {
    return response.body as Record<string, unknown>;
  }

  async function createAccessToken(role: 'ADMIN' | 'SALES' | 'MECHANIC') {
    const jwtService = new JwtService();

    return jwtService.signAsync(
      { sub: 'user-1', role },
      {
        secret: process.env.AUTH_ACCESS_TOKEN_SECRET,
        expiresIn: 900,
      },
    );
  }

  beforeEach(async () => {
    process.env.AUTH_ACCESS_TOKEN_SECRET = 'access-secret';
    process.env.AUTH_REFRESH_TOKEN_SECRET = 'refresh-secret';
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(authService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) {
      await app.close();
    }
  });

  it('POST /auth/login sets HttpOnly auth cookies and returns a sanitized user payload', async () => {
    authService.login.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'admin@mecanismos.test',
        name: 'Admin User',
        role: 'ADMIN',
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@mecanismos.test', password: 'correct-password' })
      .expect(200);
    const body = readBody(response);

    expect(body).toEqual({
      id: 'user-1',
      email: 'admin@mecanismos.test',
      name: 'Admin User',
      role: 'ADMIN',
    });
    expect(body.accessToken).toBeUndefined();
    expect(body.refreshToken).toBeUndefined();
    expect(body.passwordHash).toBeUndefined();
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('md_access=access-token'),
        expect.stringContaining('md_refresh=refresh-token'),
      ]),
    );
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).toContain('Path=/');
    expect(response.headers['set-cookie'][1]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][1]).toContain('Path=/auth/refresh');
  });

  it('POST /auth/login accepts a configured Origin header on unsafe auth requests', async () => {
    authService.login.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'admin@mecanismos.test',
        name: 'Admin User',
        role: 'ADMIN',
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ email: 'admin@mecanismos.test', password: 'correct-password' })
      .expect(200);
  });

  it('POST /auth/login rejects an unsafe auth request from a disallowed Origin', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', 'https://evil.example.com')
      .send({ email: 'admin@mecanismos.test', password: 'correct-password' })
      .expect(403);

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('POST /auth/login rejects invalid credentials without issuing auth cookies', async () => {
    authService.login.mockRejectedValue(
      new UnauthorizedException('Invalid email or password'),
    );

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@mecanismos.test', password: 'wrong-password' })
      .expect(401);

    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('POST /auth/refresh reissues auth cookies from the refresh cookie', async () => {
    authService.refresh.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'admin@mecanismos.test',
        name: 'Admin User',
        role: 'ADMIN',
      },
      accessToken: 'access-token-2',
      refreshToken: 'refresh-token-2',
    });

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', ['md_refresh=refresh-token-1'])
      .expect(200);

    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('md_access=access-token-2'),
        expect.stringContaining('md_refresh=refresh-token-2'),
      ]),
    );
    expect(authService.refresh).toHaveBeenCalledWith(
      'refresh-token-1',
      expect.any(Object),
    );
  });

  it('POST /auth/refresh accepts a configured Referer header on unsafe auth requests', async () => {
    authService.refresh.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'admin@mecanismos.test',
        name: 'Admin User',
        role: 'ADMIN',
      },
      accessToken: 'access-token-2',
      refreshToken: 'refresh-token-2',
    });

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Referer', 'http://localhost:5173/dashboard')
      .set('Cookie', ['md_refresh=refresh-token-1'])
      .expect(200);
  });

  it('POST /auth/logout clears auth cookies even when no active session remains', async () => {
    authService.logout.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', ['md_refresh=refresh-token-1'])
      .expect(200);

    expect(response.body).toEqual({ success: true });
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('md_access=;'),
        expect.stringContaining('md_refresh=;'),
      ]),
    );
  });

  it('GET /auth/me returns the authenticated user from the access-token cookie', async () => {
    authService.getCurrentUser.mockResolvedValue({
      id: 'user-1',
      email: 'admin@mecanismos.test',
      name: 'Admin User',
      role: 'ADMIN',
    });

    const accessToken = await createAccessToken('ADMIN');
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(200);

    expect(response.body).toEqual({
      id: 'user-1',
      email: 'admin@mecanismos.test',
      name: 'Admin User',
      role: 'ADMIN',
    });
    expect(authService.getCurrentUser).toHaveBeenCalledWith('user-1');
  });

  it.each(['SALES', 'MECHANIC'] as const)(
    'GET /auth/admin/smoke rejects authenticated %s users',
    async (role) => {
      const accessToken = await createAccessToken(role);

      await request(app.getHttpServer())
        .get('/auth/admin/smoke')
        .set('Cookie', [`md_access=${accessToken}`])
        .expect(403);
    },
  );

  it('GET /auth/admin/smoke allows authenticated ADMIN users', async () => {
    const accessToken = await createAccessToken('ADMIN');
    const response = await request(app.getHttpServer())
      .get('/auth/admin/smoke')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      role: 'ADMIN',
    });
  });
});
