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
  BadRequestException,
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
import { ComponentsService } from '../../src/components/components.service';
import { authJwtPayloadForRole } from '../support/auth-prisma-mock';
import { lexicalTestNote } from '../support/lexical-note';

describe('ComponentsController (e2e)', () => {
  const componentsService = {
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
      .overrideProvider(ComponentsService)
      .useValue(componentsService)
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

  it('rejects unauthenticated component listing', async () => {
    await request(app.getHttpServer()).get('/components').expect(401);
  });

  it('rejects authenticated MECHANIC component listing', async () => {
    const accessToken = await createAccessToken('MECHANIC');

    await request(app.getHttpServer())
      .get('/components')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(403);
  });

  it.each(['ADMIN', 'SALES'] as const)(
    'allows authenticated %s users to list components',
    async (role) => {
      componentsService.findAll.mockResolvedValue({
        data: [
          {
            id: 'component-1',
            customerId: 'customer-1',
            vehicleId: 'vehicle-1',
            componentTypeId: 'component-type-1',
            brand: 'Bosch',
            reference: 'ALT-90A',
            identifier: 'SER-100',
            notes: null,
            componentType: {
              id: 'component-type-1',
              name: 'Inyector',
              slug: 'inyector',
              description: null,
              isActive: true,
              createdAt: '2026-05-05T12:00:00.000Z',
              updatedAt: '2026-05-05T12:00:00.000Z',
            },
            createdAt: '2026-05-05T12:00:00.000Z',
            updatedAt: '2026-05-05T12:00:00.000Z',
          },
        ],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const accessToken = await createAccessToken(role);
      const response = await request(app.getHttpServer())
        .get(
          '/components?page=1&limit=10&customerId=customer-1&vehicleId=vehicle-1&componentTypeId=component-type-1&search=bosch',
        )
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
      expect(componentsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
          customerId: 'customer-1',
          vehicleId: 'vehicle-1',
          componentTypeId: 'component-type-1',
          search: 'bosch',
        }),
      );
    },
  );

  it('passes component lifecycle filters and options overrides to the service', async () => {
    componentsService.findAll.mockResolvedValue({
      data: [{ id: 'component-inactive', isActive: false }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    componentsService.findOptions.mockResolvedValue({
      data: [{ id: 'component-inactive', label: 'COMP-INACTIVE-001' }],
      meta: { limit: 10 },
    });

    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .get('/components?isActive=false')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(200);
    await request(app.getHttpServer())
      .get('/components/options?isActive=false')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(200);

    expect(componentsService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false }),
    );
    expect(componentsService.findOptions).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false }),
    );
  });

  it('creates a component with a matching vehicle link', async () => {
    componentsService.create.mockResolvedValue({
      id: 'component-1',
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      componentTypeId: 'component-type-1',
      brand: 'Bosch',
      reference: 'ALT-90A',
      identifier: 'SER-100',
      notes: lexicalTestNote('Alternador reemplazado'),
      createdAt: '2026-05-05T12:00:00.000Z',
      updatedAt: '2026-05-05T12:00:00.000Z',
    });

    const accessToken = await createAccessToken('ADMIN');
    const response = await request(app.getHttpServer())
      .post('/components')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
        componentTypeId: 'component-type-1',
        brand: ' Bosch ',
        reference: ' ALT-90A ',
        identifier: ' SER-100 ',
        notes: lexicalTestNote('Alternador reemplazado'),
        isActive: false,
      })
      .expect(201);
    const body = readBody<{ vehicleId: string }>(response);

    expect(body.vehicleId).toBe('vehicle-1');
    expect(componentsService.create).toHaveBeenCalledWith({
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      componentTypeId: 'component-type-1',
      brand: 'Bosch',
      reference: 'ALT-90A',
      identifier: 'SER-100',
      notes: lexicalTestNote('Alternador reemplazado'),
      isActive: false,
    });
  });

  it('rejects invalid component lifecycle input', async () => {
    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .post('/components')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        customerId: 'customer-1',
        componentTypeId: 'component-type-1',
        brand: 'Bosch',
        reference: 'ALT-90A',
        isActive: 'false',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/components')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        customerId: 'customer-1',
        componentTypeId: 'component-type-1',
        brand: 'Bosch',
        reference: 'ALT-90A',
        lifecycleState: 'inactive',
      })
      .expect(400);

    await request(app.getHttpServer())
      .get('/components?isActive=inactive')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(400);
  });

  it('creates a component without vehicleId when omitted', async () => {
    componentsService.create.mockResolvedValue({
      id: 'component-2',
      customerId: 'customer-1',
      vehicleId: null,
      componentTypeId: 'component-type-1',
      brand: 'Bosch',
      reference: 'ALT-90A',
      identifier: null,
      notes: null,
      createdAt: '2026-05-05T12:00:00.000Z',
      updatedAt: '2026-05-05T12:00:00.000Z',
    });

    const accessToken = await createAccessToken('SALES');
    const response = await request(app.getHttpServer())
      .post('/components')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        customerId: 'customer-1',
        componentTypeId: 'component-type-1',
        brand: ' Bosch ',
        reference: ' ALT-90A ',
      })
      .expect(201);
    const body = readBody<{ vehicleId: null }>(response);

    expect(body.vehicleId).toBeNull();
    expect(componentsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'customer-1',
        componentTypeId: 'component-type-1',
        brand: 'Bosch',
        reference: 'ALT-90A',
      }),
    );
  });

  it('creates a component with inline references through standard POST', async () => {
    componentsService.create.mockResolvedValue({
      id: 'component-inline',
      customerId: 'customer-inline',
      vehicleId: 'vehicle-inline',
      componentTypeId: 'component-type-inline',
      brandId: 'brand-bosch',
      brand: 'Bosch',
      reference: 'ALT-90A',
      identifier: null,
      notes: null,
      brandRef: { id: 'brand-bosch', name: 'Bosch' },
      componentType: { id: 'component-type-inline', name: 'Alternador' },
      createdAt: '2026-05-05T12:00:00.000Z',
      updatedAt: '2026-05-05T12:00:00.000Z',
    });

    const accessToken = await createAccessToken('ADMIN');
    const response = await request(app.getHttpServer())
      .post('/components')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        customer: {
          name: 'Laura Perez',
          phone: '3001112233',
          documentType: 'CEDULA',
          documentNumber: '123',
        },
        componentType: { name: ' Alternador ' },
        brand: { name: ' BoScH ' },
        reference: ' ALT-90A ',
        vehicle: {
          brand: ' Mazda ',
          modelReference: 'BT-50',
          plate: ' xyz987 ',
        },
      })
      .expect(201);
    const body = readBody<{ componentTypeId: string; vehicleId: string }>(response);

    expect(body.componentTypeId).toBe('component-type-inline');
    expect(body.vehicleId).toBe('vehicle-inline');
    expect(componentsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: 'BoScH',
        reference: 'ALT-90A',
        componentType: { name: 'Alternador' },
        vehicle: expect.objectContaining({ brand: 'Mazda', plate: 'XYZ987' }),
      }),
    );
  });

  it('maps missing parent customer errors to 404', async () => {
    componentsService.create.mockRejectedValue(
      new NotFoundException('Customer missing-customer not found'),
    );

    const accessToken = await createAccessToken('ADMIN');
    await request(app.getHttpServer())
      .post('/components')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        customerId: 'missing-customer',
        componentTypeId: 'component-type-1',
        brand: 'Bosch',
        reference: 'ALT-90A',
      })
      .expect(404);
  });

  it('maps cross-customer vehicle mismatch errors to 400', async () => {
    componentsService.create.mockRejectedValue(
      new BadRequestException(
        'Vehicle vehicle-2 does not belong to customer customer-1',
      ),
    );

    const accessToken = await createAccessToken('ADMIN');
    await request(app.getHttpServer())
      .post('/components')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        customerId: 'customer-1',
        vehicleId: 'vehicle-2',
        componentTypeId: 'component-type-1',
        brand: 'Bosch',
        reference: 'ALT-90A',
      })
      .expect(400);
  });

  it('maps duplicate inline vehicle plate errors to 409', async () => {
    componentsService.create.mockRejectedValue(
      new ConflictException('Vehicle plate already exists'),
    );

    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .post('/components')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        customer: {
          name: 'Laura Perez',
          phone: '3001112233',
          documentType: 'CEDULA',
          documentNumber: '123',
        },
        componentType: { name: 'Alternador' },
        brand: { name: 'Bosch' },
        reference: 'ALT-90A',
        vehicle: {
          brand: 'Mazda',
          modelReference: 'BT-50',
          plate: 'ABC123',
        },
      })
      .expect(409);
  });

  it('returns a component by id', async () => {
    componentsService.findOne.mockResolvedValue({
      id: 'component-1',
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      componentTypeId: 'component-type-1',
      brand: 'Bosch',
      reference: 'ALT-90A',
      identifier: 'SER-100',
      notes: null,
      createdAt: '2026-05-05T12:00:00.000Z',
      updatedAt: '2026-05-05T12:00:00.000Z',
    });

    const accessToken = await createAccessToken('SALES');
    const response = await request(app.getHttpServer())
      .get('/components/component-1')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(200);
    const body = readBody<{ id: string }>(response);

    expect(body.id).toBe('component-1');
    expect(componentsService.findOne).toHaveBeenCalledWith('component-1');
  });

  it('updates an existing component within the same customer boundary', async () => {
    componentsService.update.mockResolvedValue({
      id: 'component-1',
      customerId: 'customer-1',
      vehicleId: 'vehicle-3',
      componentTypeId: 'component-type-2',
      brand: 'Bosch',
      reference: 'ALT-120A',
      identifier: 'SER-100',
      notes: lexicalTestNote('Actualizado'),
      createdAt: '2026-05-05T12:00:00.000Z',
      updatedAt: '2026-05-05T13:00:00.000Z',
    });

    const accessToken = await createAccessToken('ADMIN');
    const response = await request(app.getHttpServer())
      .patch('/components/component-1')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        vehicleId: 'vehicle-3',
        componentTypeId: 'component-type-2',
        reference: ' ALT-120A ',
        notes: lexicalTestNote('Actualizado'),
        isActive: false,
      })
      .expect(200);
    const body = readBody<{ vehicleId: string }>(response);

    expect(body.vehicleId).toBe('vehicle-3');
    expect(componentsService.update).toHaveBeenCalledWith(
      'component-1',
      expect.objectContaining({
        vehicleId: 'vehicle-3',
        componentTypeId: 'component-type-2',
        reference: 'ALT-120A',
        notes: lexicalTestNote('Actualizado'),
        isActive: false,
      }),
    );
  });

  it('allows clearing the vehicle link on update', async () => {
    componentsService.update.mockResolvedValue({
      id: 'component-1',
      customerId: 'customer-1',
      vehicleId: null,
      componentTypeId: 'component-type-1',
      brand: 'Bosch',
      reference: 'ALT-90A',
      identifier: 'SER-100',
      notes: null,
      createdAt: '2026-05-05T12:00:00.000Z',
      updatedAt: '2026-05-05T13:00:00.000Z',
    });

    const accessToken = await createAccessToken('ADMIN');
    const response = await request(app.getHttpServer())
      .patch('/components/component-1')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        vehicleId: null,
      })
      .expect(200);
    const body = readBody<{ vehicleId: null }>(response);

    expect(body.vehicleId).toBeNull();
    expect(componentsService.update).toHaveBeenCalledWith('component-1', {
      vehicleId: null,
    });
  });

  it('rejects component ownership reassignment attempts through customerId updates', async () => {
    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .patch('/components/component-1')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        customerId: 'customer-2',
      })
      .expect(400);
  });

  it('rejects create-only component aggregate relation fields on update', async () => {
    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .patch('/components/component-1')
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
      .patch('/components/component-1')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({ componentType: { name: 'Alternador' } })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/components/component-1')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({ vehicle: { brand: 'Mazda', modelReference: 'BT-50', plate: 'XYZ987' } })
      .expect(400);
  });
});
