jest.mock('../../src/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {
    async $connect() {}
    async $disconnect() {}
  },
}));

import {
  ConflictException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { ComponentTypesService } from '../../src/component-types/component-types.service';

describe('ComponentTypesController (e2e)', () => {
  const componentTypesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  let app: INestApplication<App>;

  function readBody<T>(response: request.Response): T {
    return response.body as T;
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
      .overrideProvider(ComponentTypesService)
      .useValue(componentTypesService)
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

  it('rejects unauthenticated component type listing', async () => {
    await request(app.getHttpServer()).get('/component-types').expect(401);
  });

  it('rejects authenticated MECHANIC component type listing', async () => {
    const accessToken = await createAccessToken('MECHANIC');

    await request(app.getHttpServer())
      .get('/component-types')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(403);
  });

  it.each(['ADMIN', 'SALES'] as const)(
    'allows authenticated %s users to list component types',
    async (role) => {
      componentTypesService.findAll.mockResolvedValue({
        data: [
          {
            id: 'component-type-1',
            name: 'Inyector',
            slug: 'inyector',
            description: null,
            isActive: true,
            createdAt: '2026-05-05T12:00:00.000Z',
            updatedAt: '2026-05-05T12:00:00.000Z',
          },
        ],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const accessToken = await createAccessToken(role);
      const response = await request(app.getHttpServer())
        .get('/component-types?page=1&limit=10&search=iny&isActive=true')
        .set('Cookie', [`md_access=${accessToken}`])
        .expect(200);
      const body = readBody<{
        meta: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(response);

      expect(body.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
      expect(componentTypesService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'iny',
        isActive: true,
      });
    },
  );

  it('creates a component type from a combobox-style name', async () => {
    componentTypesService.create.mockResolvedValue({
      id: 'component-type-1',
      name: 'Bomba de inyección',
      slug: 'bomba-de-inyeccion',
      description: 'Bombas diesel',
      isActive: true,
      createdAt: '2026-05-05T12:00:00.000Z',
      updatedAt: '2026-05-05T12:00:00.000Z',
    });

    const accessToken = await createAccessToken('ADMIN');
    const response = await request(app.getHttpServer())
      .post('/component-types')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: '  Bomba de inyección  ',
        description: '  Bombas diesel  ',
      })
      .expect(201);
    const body = readBody<{ slug: string }>(response);

    expect(body.slug).toBe('bomba-de-inyeccion');
    expect(componentTypesService.create).toHaveBeenCalledWith({
      name: 'Bomba de inyección',
      description: 'Bombas diesel',
    });
  });

  it('maps duplicate component type slugs to 409', async () => {
    componentTypesService.create.mockRejectedValue(
      new ConflictException('Component type slug already exists'),
    );

    const accessToken = await createAccessToken('SALES');
    await request(app.getHttpServer())
      .post('/component-types')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: 'Inyector',
      })
      .expect(409);
  });

  it('returns a component type by id', async () => {
    componentTypesService.findOne.mockResolvedValue({
      id: 'component-type-1',
      name: 'Inyector',
      slug: 'inyector',
      description: null,
      isActive: true,
      createdAt: '2026-05-05T12:00:00.000Z',
      updatedAt: '2026-05-05T12:00:00.000Z',
    });

    const accessToken = await createAccessToken('ADMIN');
    const response = await request(app.getHttpServer())
      .get('/component-types/component-type-1')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(200);
    const body = readBody<{ id: string }>(response);

    expect(body.id).toBe('component-type-1');
    expect(componentTypesService.findOne).toHaveBeenCalledWith(
      'component-type-1',
    );
  });

  it('updates an existing component type', async () => {
    componentTypesService.update.mockResolvedValue({
      id: 'component-type-1',
      name: 'Tobera',
      slug: 'tobera-diesel',
      description: 'Tobera actualizada',
      isActive: false,
      createdAt: '2026-05-05T12:00:00.000Z',
      updatedAt: '2026-05-05T13:00:00.000Z',
    });

    const accessToken = await createAccessToken('ADMIN');
    const response = await request(app.getHttpServer())
      .patch('/component-types/component-type-1')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: '  Tobera  ',
        slug: '  Tobera Diesel  ',
        description: '  Tobera actualizada  ',
        isActive: false,
      })
      .expect(200);
    const body = readBody<{ isActive: boolean; slug: string }>(response);

    expect(body.isActive).toBe(false);
    expect(body.slug).toBe('tobera-diesel');
    expect(componentTypesService.update).toHaveBeenCalledWith(
      'component-type-1',
      {
        name: 'Tobera',
        slug: 'Tobera Diesel',
        description: 'Tobera actualizada',
        isActive: false,
      },
    );
  });

  it('maps missing component type lookups to 404', async () => {
    componentTypesService.findOne.mockRejectedValue(
      new NotFoundException('Component type missing-component-type not found'),
    );

    const accessToken = await createAccessToken('ADMIN');
    await request(app.getHttpServer())
      .get('/component-types/missing-component-type')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(404);
  });
});
