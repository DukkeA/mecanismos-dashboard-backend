jest.mock('../../src/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {
    async $connect() {}
    async $disconnect() {}
  },
}));

import {
  BadRequestException,
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
import { ComponentsService } from '../../src/components/components.service';
import { CostCentersService } from '../../src/cost-centers/cost-centers.service';
import { CustomersService } from '../../src/customers/customers.service';
import { EmployeesService } from '../../src/employees/employees.service';
import { InventoryService } from '../../src/inventory/inventory.service';
import { ServicesService } from '../../src/services/services.service';
import { VehiclesService } from '../../src/vehicles/vehicles.service';

describe('Reference-data quick-create endpoints (e2e)', () => {
  const customersService = {
    quickCreate: jest.fn(),
  };
  const vehiclesService = {
    findOptions: jest.fn(),
  };
  const componentsService = {
    quickCreate: jest.fn(),
  };
  const servicesService = {
    findOptions: jest.fn(),
  };
  const inventoryService = {
    quickCreateItem: jest.fn(),
  };
  const employeesService = {
    quickCreate: jest.fn(),
  };
  const costCentersService = {
    quickCreate: jest.fn(),
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
      .overrideProvider(CustomersService)
      .useValue(customersService)
      .overrideProvider(VehiclesService)
      .useValue(vehiclesService)
      .overrideProvider(ComponentsService)
      .useValue(componentsService)
      .overrideProvider(ServicesService)
      .useValue(servicesService)
      .overrideProvider(InventoryService)
      .useValue(inventoryService)
      .overrideProvider(EmployeesService)
      .useValue(employeesService)
      .overrideProvider(CostCentersService)
      .useValue(costCentersService)
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

  it('rejects unauthenticated reference-data options', async () => {
    await request(app.getHttpServer()).get('/services/options').expect(401);
  });

  it('rejects authenticated MECHANIC quick-create access', async () => {
    const accessToken = await createAccessToken('MECHANIC');

    await request(app.getHttpServer())
      .post('/customers/quick-create')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: 'Ana Gomez',
        phone: '3001234567',
        documentType: 'CEDULA',
        documentNumber: '123456789',
      })
      .expect(403);
  });

  it('returns bounded option payloads with trimmed search terms', async () => {
    servicesService.findOptions.mockResolvedValue({
      data: [{ id: 'service-1', label: 'Diagnóstico electrónico' }],
      meta: { limit: 10 },
    });

    const accessToken = await createAccessToken('ADMIN');
    const response = await request(app.getHttpServer())
      .get('/services/options?search=%20diag%20')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(200);
    const body = readBody<{
      data: Array<{ id: string; label: string }>;
      meta: { limit: number };
    }>(response);

    expect(body).toEqual({
      data: [{ id: 'service-1', label: 'Diagnóstico electrónico' }],
      meta: { limit: 10 },
    });
    expect(servicesService.findOptions).toHaveBeenCalledWith({
      search: 'diag',
      limit: 10,
    });
  });

  it('validates option limits above 100', async () => {
    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .get('/services/options?limit=101')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(400);
  });

  it('passes customer-scoped vehicle filters through the options endpoint', async () => {
    vehiclesService.findOptions.mockResolvedValue({
      data: [
        {
          id: 'vehicle-1',
          label: 'ABC123 · Mazda CX5',
          context: { customerId: 'customer-1' },
        },
      ],
      meta: { limit: 10 },
    });

    const accessToken = await createAccessToken('SALES');
    const response = await request(app.getHttpServer())
      .get('/vehicles/options?customerId=customer-1&search=%20abc%20')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(200);

    const body = readBody<{
      data: Array<{ id: string; context: { customerId: string } }>;
    }>(response);

    expect(body.data[0]).toMatchObject({
      id: 'vehicle-1',
      context: { customerId: 'customer-1' },
    });
    expect(vehiclesService.findOptions).toHaveBeenCalledWith({
      customerId: 'customer-1',
      search: 'abc',
      limit: 10,
    });
  });

  it('returns employee quick-create responses with incomplete-profile metadata', async () => {
    employeesService.quickCreate.mockResolvedValue({
      data: {
        id: 'employee-1',
        label: 'Ana Torres',
        context: { type: 'MECHANIC', costCenterCode: 'TALLER' },
      },
      meta: { incompleteProfile: true },
      entity: { id: 'employee-1', baseSalaryMonthly: 0 },
    });

    const accessToken = await createAccessToken('ADMIN');
    const response = await request(app.getHttpServer())
      .post('/employees/quick-create')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: ' Ana Torres ',
        type: 'MECHANIC',
        costCenterId: 'cost-center-1',
      })
      .expect(201);
    const body = readBody<{
      meta: { incompleteProfile: boolean };
      entity: { baseSalaryMonthly: number };
    }>(response);

    expect(body.meta.incompleteProfile).toBe(true);
    expect(body.entity.baseSalaryMonthly).toBe(0);
  });

  it('maps duplicate customer quick-create conflicts to 409', async () => {
    customersService.quickCreate.mockRejectedValue(
      new ConflictException('Customer document already exists'),
    );

    const accessToken = await createAccessToken('ADMIN');
    await request(app.getHttpServer())
      .post('/customers/quick-create')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: 'Ana Gomez',
        phone: '3001234567',
        documentType: 'CEDULA',
        documentNumber: '123456789',
      })
      .expect(409);
  });

  it('maps cross-customer component quick-create violations to 400', async () => {
    componentsService.quickCreate.mockRejectedValue(
      new BadRequestException(
        'Vehicle vehicle-2 does not belong to customer customer-1',
      ),
    );

    const accessToken = await createAccessToken('ADMIN');
    await request(app.getHttpServer())
      .post('/components/quick-create')
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

  it('returns option-compatible inventory quick-create responses without stock payloads', async () => {
    inventoryService.quickCreateItem.mockResolvedValue({
      data: {
        id: 'item-1',
        label: 'Filtro de aceite',
        context: { itemType: 'STOCK_OWNED', condition: 'NEW' },
      },
      entity: {
        id: 'item-1',
        name: 'Filtro de aceite',
        itemType: 'STOCK_OWNED',
      },
    });

    const accessToken = await createAccessToken('SALES');
    const response = await request(app.getHttpServer())
      .post('/inventory-items/quick-create')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: 'Filtro de aceite',
        itemType: 'STOCK_OWNED',
        condition: 'NEW',
      })
      .expect(201);

    expect(readBody(response)).toMatchObject({
      data: { id: 'item-1', label: 'Filtro de aceite' },
    });
    expect(JSON.stringify(response.body)).not.toContain('currentStock');
  });

  it('allows cost-center quick-create for frontend comboboxes', async () => {
    costCentersService.quickCreate.mockResolvedValue({
      data: {
        id: 'cost-center-1',
        label: 'Bodega principal',
        context: { code: 'BODEGA' },
      },
      entity: { id: 'cost-center-1', code: 'BODEGA', name: 'Bodega principal' },
    });

    const accessToken = await createAccessToken('ADMIN');
    const response = await request(app.getHttpServer())
      .post('/cost-centers/quick-create')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({ code: ' BODEGA ', name: ' Bodega principal ' })
      .expect(201);

    expect(readBody(response)).toMatchObject({
      data: { id: 'cost-center-1', context: { code: 'BODEGA' } },
    });
  });
});
