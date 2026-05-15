jest.mock('../../src/prisma.service', () => {
  const authPrismaMock = jest.requireActual<
    typeof import('../support/auth-prisma-mock')
  >('../support/auth-prisma-mock');

  return {
    PrismaService: class PrismaServiceMock {
      user = {
        findFirst: jest.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(authPrismaMock.findActiveAuthUserById(where.id)),
        ),
      };

      async $connect() {}
      async $disconnect() {}
    },
  };
});

import {
  ConflictException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { BrandsService } from '../../src/brands/brands.service';
import { authJwtPayloadForRole } from '../support/auth-prisma-mock';

describe('BrandsController (e2e)', () => {
  const brandsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOptions: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  let app: INestApplication<App>;

  async function createAccessToken(role: 'ADMIN' | 'SALES' | 'MECHANIC') {
    const jwtService = new JwtService();

    return jwtService.signAsync(authJwtPayloadForRole(role), {
      secret: process.env.AUTH_ACCESS_TOKEN_SECRET,
      expiresIn: 900,
    });
  }

  beforeEach(async () => {
    process.env.AUTH_ACCESS_TOKEN_SECRET = 'access-secret';
    process.env.AUTH_REFRESH_TOKEN_SECRET = 'refresh-secret';
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(BrandsService)
      .useValue(brandsService)
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

  it('lists brands and passes normalized query parameters to the service', async () => {
    brandsService.findAll.mockResolvedValue({
      data: [{ id: 'brand-bosch', name: 'Bosch', isActive: true }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    const accessToken = await createAccessToken('SALES');

    await request(app.getHttpServer())
      .get('/brands?page=1&limit=10&search=bosch&isActive=true')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(200);

    expect(brandsService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 10,
        search: 'bosch',
        isActive: true,
      }),
    );
  });

  it('returns active brand options by default', async () => {
    brandsService.findOptions.mockResolvedValue({
      data: [{ id: 'brand-bosch', label: 'Bosch', isActive: true }],
      meta: { limit: 10 },
    });

    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .get('/brands/options?limit=10&search=bosch')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(200);

    expect(brandsService.findOptions).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, search: 'bosch' }),
    );
  });

  it('creates or reuses a brand by normalized name', async () => {
    brandsService.create.mockResolvedValue({
      id: 'brand-bosch',
      name: 'Bosch',
      normalizedName: 'bosch',
      isActive: true,
    });

    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .post('/brands')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({ name: ' BoScH ' })
      .expect(201)
      .expect(({ body }: { body: { id: string; name: string } }) => {
        expect(body).toMatchObject({ id: 'brand-bosch', name: 'Bosch' });
      });

    expect(brandsService.create).toHaveBeenCalledWith({ name: 'BoScH' });
  });

  it('updates a brand lifecycle and display name', async () => {
    brandsService.update.mockResolvedValue({
      id: 'brand-bosch',
      name: 'Bosch Diesel',
      normalizedName: 'bosch diesel',
      isActive: false,
    });

    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .patch('/brands/brand-bosch')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({ name: ' Bosch Diesel ', isActive: false })
      .expect(200)
      .expect(({ body }: { body: { name: string; isActive: boolean } }) => {
        expect(body).toMatchObject({ name: 'Bosch Diesel', isActive: false });
      });

    expect(brandsService.update).toHaveBeenCalledWith('brand-bosch', {
      name: 'Bosch Diesel',
      isActive: false,
    });
  });

  it('maps normalized duplicate brand rename errors to 409', async () => {
    brandsService.update.mockRejectedValue(
      new ConflictException('Brand name already exists'),
    );

    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .patch('/brands/brand-bosch')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({ name: 'BOSCH' })
      .expect(409);
  });
});
