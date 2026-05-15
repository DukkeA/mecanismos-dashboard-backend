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
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { VehiclesService } from '../../src/vehicles/vehicles.service';
import { authJwtPayloadForRole } from '../support/auth-prisma-mock';
import { lexicalTestNote } from '../support/lexical-note';

describe('VehiclesController (e2e)', () => {
  const vehiclesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOptions: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  let app: INestApplication<App>;

  function readBody<T>(response: request.Response): T {
    return response.body as T;
  }

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
      .overrideProvider(VehiclesService)
      .useValue(vehiclesService)
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

  it('rejects unauthenticated vehicle listing', async () => {
    await request(app.getHttpServer()).get('/vehicles').expect(401);
  });

  it('rejects authenticated MECHANIC vehicle listing', async () => {
    const accessToken = await createAccessToken('MECHANIC');

    await request(app.getHttpServer())
      .get('/vehicles')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(403);
  });

  it.each(['ADMIN', 'SALES'] as const)(
    'allows authenticated %s users to list vehicles',
    async (role) => {
      vehiclesService.findAll.mockResolvedValue({
        data: [
          {
            id: 'vehicle-1',
            customerId: 'customer-1',
            brand: 'Mazda',
            modelReference: 'CX5',
            plate: 'ABC123',
            notes: null,
            createdAt: '2026-05-05T12:00:00.000Z',
            updatedAt: '2026-05-05T12:00:00.000Z',
          },
        ],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const accessToken = await createAccessToken(role);
      const response = await request(app.getHttpServer())
        .get('/vehicles?page=1&limit=10&customerId=customer-1&search=mazda')
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
      expect(vehiclesService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
          customerId: 'customer-1',
          search: 'mazda',
        }),
      );
    },
  );

  it('passes vehicle lifecycle filters and options overrides to the service', async () => {
    vehiclesService.findAll.mockResolvedValue({
      data: [{ id: 'vehicle-inactive', isActive: false }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    vehiclesService.findOptions.mockResolvedValue({
      data: [{ id: 'vehicle-inactive', label: 'INA001' }],
      meta: { limit: 10 },
    });

    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .get('/vehicles?isActive=false')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(200);
    await request(app.getHttpServer())
      .get('/vehicles/options?isActive=false')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(200);

    expect(vehiclesService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false }),
    );
    expect(vehiclesService.findOptions).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false }),
    );
  });

  it('creates a vehicle for an existing customer', async () => {
    vehiclesService.create.mockResolvedValue({
      id: 'vehicle-1',
      customerId: 'customer-1',
      brand: 'Mazda',
      modelReference: 'CX5',
      plate: 'ABC123',
      notes: lexicalTestNote('Blindaje nivel 1'),
      createdAt: '2026-05-05T12:00:00.000Z',
      updatedAt: '2026-05-05T12:00:00.000Z',
    });

    const accessToken = await createAccessToken('ADMIN');
    const response = await request(app.getHttpServer())
      .post('/vehicles')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        customerId: 'customer-1',
        brand: ' Mazda ',
        modelReference: ' CX5 ',
        plate: ' abc123 ',
        notes: lexicalTestNote('Blindaje nivel 1'),
        isActive: false,
      })
      .expect(201);
    const body = readBody<{ plate: string }>(response);

    expect(body.plate).toBe('ABC123');
    expect(vehiclesService.create).toHaveBeenCalledWith({
      customerId: 'customer-1',
      brand: 'Mazda',
      modelReference: 'CX5',
      plate: 'ABC123',
      notes: lexicalTestNote('Blindaje nivel 1'),
      isActive: false,
    });
  });

  it('creates a vehicle with inline customer and brand name through standard POST', async () => {
    vehiclesService.create.mockResolvedValue({
      id: 'vehicle-inline',
      customerId: 'customer-inline',
      brandId: 'brand-bosch',
      brand: 'Bosch',
      brandRef: { id: 'brand-bosch', name: 'Bosch' },
      modelReference: 'BT-50',
      plate: 'XYZ987',
      notes: null,
      createdAt: '2026-05-05T12:00:00.000Z',
      updatedAt: '2026-05-05T12:00:00.000Z',
    });

    const accessToken = await createAccessToken('ADMIN');
    const response = await request(app.getHttpServer())
      .post('/vehicles')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        customer: {
          name: ' Laura Perez ',
          phone: ' 3001112233 ',
          documentType: 'CEDULA',
          documentNumber: ' 123 ',
        },
        brand: { name: ' BoScH ' },
        modelReference: ' BT-50 ',
        plate: ' xyz987 ',
      })
      .expect(201);
    const body = readBody<{ brandId: string; plate: string }>(response);

    expect(body.brandId).toBe('brand-bosch');
    expect(body.plate).toBe('XYZ987');
    expect(vehiclesService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: 'BoScH',
        plate: 'XYZ987',
        customer: expect.objectContaining({ phone: '3001112233' }),
      }),
    );
  });

  it('rejects invalid vehicle lifecycle input', async () => {
    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .post('/vehicles')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        customerId: 'customer-1',
        brand: 'Mazda',
        modelReference: 'CX5',
        plate: 'ABC123',
        isActive: 'false',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/vehicles')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        customerId: 'customer-1',
        brand: 'Mazda',
        modelReference: 'CX5',
        plate: 'ABC123',
        lifecycleState: 'inactive',
      })
      .expect(400);

    await request(app.getHttpServer())
      .get('/vehicles/options?isActive=inactive')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(400);
  });

  it('maps duplicate vehicle plate errors to 409', async () => {
    vehiclesService.create.mockRejectedValue(
      new ConflictException('Vehicle plate already exists'),
    );

    const accessToken = await createAccessToken('ADMIN');
    await request(app.getHttpServer())
      .post('/vehicles')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        customerId: 'customer-1',
        brand: 'Mazda',
        modelReference: 'CX5',
        plate: 'ABC123',
      })
      .expect(409);
  });

  it('maps missing parent customer errors to 404', async () => {
    vehiclesService.create.mockRejectedValue(
      new NotFoundException('Customer missing-customer not found'),
    );

    const accessToken = await createAccessToken('ADMIN');
    await request(app.getHttpServer())
      .post('/vehicles')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        customerId: 'missing-customer',
        brand: 'Mazda',
        modelReference: 'CX5',
        plate: 'ABC123',
      })
      .expect(404);
  });

  it('returns a vehicle by id', async () => {
    vehiclesService.findOne.mockResolvedValue({
      id: 'vehicle-1',
      customerId: 'customer-1',
      brand: 'Mazda',
      modelReference: 'CX5',
      plate: 'ABC123',
      notes: null,
      createdAt: '2026-05-05T12:00:00.000Z',
      updatedAt: '2026-05-05T12:00:00.000Z',
    });

    const accessToken = await createAccessToken('SALES');
    const response = await request(app.getHttpServer())
      .get('/vehicles/vehicle-1')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(200);
    const body = readBody<{ id: string }>(response);

    expect(body.id).toBe('vehicle-1');
    expect(vehiclesService.findOne).toHaveBeenCalledWith('vehicle-1');
  });

  it('updates an existing vehicle', async () => {
    vehiclesService.update.mockResolvedValue({
      id: 'vehicle-1',
      customerId: 'customer-1',
      brand: 'Mazda',
      modelReference: 'CX50',
      plate: 'XYZ987',
      notes: lexicalTestNote('Actualizado'),
      createdAt: '2026-05-05T12:00:00.000Z',
      updatedAt: '2026-05-05T13:00:00.000Z',
    });

    const accessToken = await createAccessToken('ADMIN');
    const response = await request(app.getHttpServer())
      .patch('/vehicles/vehicle-1')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        brand: ' Mazda ',
        modelReference: ' CX50 ',
        plate: ' xyz987 ',
        notes: lexicalTestNote('Actualizado'),
        isActive: false,
      })
      .expect(200);
    const body = readBody<{ plate: string }>(response);

    expect(body.plate).toBe('XYZ987');
    expect(vehiclesService.update).toHaveBeenCalledWith('vehicle-1', {
      brand: 'Mazda',
      modelReference: 'CX50',
      plate: 'XYZ987',
      notes: lexicalTestNote('Actualizado'),
      isActive: false,
    });
  });

  it('rejects vehicle reassignment attempts through customerId updates', async () => {
    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .patch('/vehicles/vehicle-1')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        customerId: 'customer-2',
      })
      .expect(400);
  });

  it('rejects create-only vehicle aggregate relation fields on update', async () => {
    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .patch('/vehicles/vehicle-1')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        customer: {
          name: 'Laura Perez',
          phone: '3001112233',
          documentType: 'CEDULA',
          documentNumber: '123',
        },
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/vehicles/vehicle-1')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({ brandId: 'brand-bosch' })
      .expect(400);
  });
});
