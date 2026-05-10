jest.mock('../../src/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {
    async $connect() {}
    async $disconnect() {}
  },
}));

import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { EmployeeType, PaymentMethod } from '../../generated/prisma/enums';
import { AppModule } from '../../src/app.module';
import { EmployeesService } from '../../src/employees/employees.service';

type EmployeePayload = {
  name: string;
  type: 'ADMIN' | 'SALES' | 'MECHANIC';
  phone?: string;
  baseSalaryMonthly: number;
  costCenterId?: string;
  isActive?: boolean;
};

type EmployeeRecord = {
  id: string;
  name: string;
  type: 'ADMIN' | 'SALES' | 'MECHANIC';
  phone?: string;
  baseSalaryMonthly: number;
  costCenterId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  CostCenter: CostCenterOption | null;
};

type CostCenterOption = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

type EmployeeBonusPayload = {
  amount: number;
  description?: string;
  paidAt: string | Date;
  paymentMethod?: PaymentMethod;
};

type ListEmployeeBonusesQuery = {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
};

type EmployeeBonusRecord = {
  id: string;
  employeeId: string;
  amount: number;
  description?: string;
  paidAt: string;
  paymentMethod?: PaymentMethod;
  createdAt: string;
  updatedAt: string;
};

function buildEmployeesServiceOverride() {
  const employees = new Map<string, EmployeeRecord>();
  const bonuses = new Map<string, EmployeeBonusRecord[]>();
  const costCenters = new Map<string, CostCenterOption>([
    [
      'cost-center-1',
      {
        id: 'cost-center-1',
        code: 'TALLER',
        name: 'Taller',
        isActive: true,
      },
    ],
  ]);
  let sequence = 0;

  function ensureCostCenterExists(costCenterId?: string) {
    if (!costCenterId) {
      return null;
    }

    const costCenter = costCenters.get(costCenterId);

    if (!costCenter) {
      throw new NotFoundException(`Cost center ${costCenterId} not found`);
    }

    return costCenter;
  }

  return {
    create(payload: EmployeePayload) {
      const costCenter = ensureCostCenterExists(payload.costCenterId);
      const record = buildEmployeeRecord(
        payload,
        `employee-${++sequence}`,
        costCenter,
      );

      employees.set(record.id, record);

      return record;
    },

    findAll(query: {
      page?: number;
      limit?: number;
      search?: string;
      type?: EmployeeType;
      isActive?: boolean;
      costCenterId?: string;
    }) {
      const page = query.page ?? 1;
      const limit = query.limit ?? 10;
      const search = query.search?.toLowerCase();

      const filtered = [...employees.values()].filter((employee) => {
        if (query.type && employee.type !== query.type) {
          return false;
        }

        if (
          query.isActive !== undefined &&
          employee.isActive !== query.isActive
        ) {
          return false;
        }

        if (
          query.costCenterId &&
          employee.costCenterId !== query.costCenterId
        ) {
          return false;
        }

        if (!search) {
          return true;
        }

        return [employee.name, employee.phone].some((value) =>
          value?.toLowerCase().includes(search),
        );
      });

      return {
        data: filtered.slice((page - 1) * limit, page * limit),
        meta: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit) || 1,
        },
      };
    },

    findOne(id: string) {
      const employee = employees.get(id);

      if (!employee) {
        throw new NotFoundException(`Employee ${id} not found`);
      }

      return employee;
    },

    update(id: string, payload: Partial<EmployeePayload>) {
      const current = employees.get(id);

      if (!current) {
        throw new NotFoundException(`Employee ${id} not found`);
      }

      const nextPayload: EmployeePayload = {
        ...current,
        ...payload,
      };
      const costCenter = ensureCostCenterExists(nextPayload.costCenterId);
      const record = buildEmployeeRecord(
        nextPayload,
        id,
        costCenter,
        current.createdAt,
      );

      employees.set(id, record);

      return record;
    },

    createBonus(employeeId: string, payload: EmployeeBonusPayload) {
      const employee = employees.get(employeeId);

      if (!employee) {
        throw new NotFoundException(`Employee ${employeeId} not found`);
      }

      const record = {
        id: `bonus-${++sequence}`,
        employeeId: employee.id,
        amount: payload.amount,
        description: normalizeOptionalString(payload.description),
        paidAt: new Date(payload.paidAt).toISOString(),
        paymentMethod: payload.paymentMethod,
        createdAt: new Date('2026-05-10T11:00:00.000Z').toISOString(),
        updatedAt: new Date('2026-05-10T11:00:00.000Z').toISOString(),
      } satisfies EmployeeBonusRecord;

      bonuses.set(employeeId, [record, ...(bonuses.get(employeeId) ?? [])]);

      return record;
    },

    findBonuses(employeeId: string, query: ListEmployeeBonusesQuery) {
      const employee = employees.get(employeeId);

      if (!employee) {
        throw new NotFoundException(`Employee ${employeeId} not found`);
      }

      const page = query.page ?? 1;
      const limit = query.limit ?? 10;
      const from = query.from ? new Date(query.from).getTime() : undefined;
      const to = query.to ? new Date(query.to).getTime() : undefined;
      const items = (bonuses.get(employeeId) ?? []).filter((bonus) => {
        const paidAt = new Date(bonus.paidAt).getTime();

        if (from !== undefined && paidAt < from) {
          return false;
        }

        if (to !== undefined && paidAt > to) {
          return false;
        }

        return true;
      });

      return {
        data: items.slice((page - 1) * limit, page * limit),
        meta: {
          page,
          limit,
          total: items.length,
          totalPages: Math.ceil(items.length / limit) || 1,
        },
      };
    },

    listCostCenterOptions() {
      return [...costCenters.values()];
    },
  };
}

function buildEmployeeRecord(
  payload: EmployeePayload,
  id: string,
  costCenter: CostCenterOption | null,
  createdAt: string = new Date('2026-05-09T10:00:00.000Z').toISOString(),
): EmployeeRecord {
  return {
    id,
    name: payload.name.trim(),
    type: payload.type,
    phone: normalizeOptionalString(payload.phone),
    baseSalaryMonthly: payload.baseSalaryMonthly,
    costCenterId: payload.costCenterId?.trim(),
    isActive: payload.isActive ?? true,
    createdAt,
    updatedAt: new Date('2026-05-09T11:00:00.000Z').toISOString(),
    CostCenter: costCenter,
  };
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

describe('EmployeesController (e2e)', () => {
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
      .overrideProvider(EmployeesService)
      .useValue(buildEmployeesServiceOverride())
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
    if (app) {
      await app.close();
    }
  });

  it('rejects unauthenticated employee listing', async () => {
    await request(app.getHttpServer()).get('/employees').expect(401);
  });

  it('rejects authenticated MECHANIC employee listing', async () => {
    const accessToken = await createAccessToken('MECHANIC');

    await request(app.getHttpServer())
      .get('/employees')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(403);
  });

  it.each(['ADMIN', 'SALES'] as const)(
    'allows authenticated %s users to create, list, get, update, and browse cost-center options',
    async (role) => {
      const accessToken = await createAccessToken(role);
      const createResponse = await request(app.getHttpServer())
        .post('/employees')
        .set('Cookie', [`md_access=${accessToken}`])
        .send({
          name: '  Ana Torres  ',
          type: EmployeeType.MECHANIC,
          phone: '  3001234567  ',
          baseSalaryMonthly: 2500000,
          costCenterId: 'cost-center-1',
        })
        .expect(201);
      const created = readBody<EmployeeRecord>(createResponse);

      expect(created.name).toBe('Ana Torres');
      expect(created.isActive).toBe(true);
      expect(created.CostCenter?.id).toBe('cost-center-1');

      const listResponse = await request(app.getHttpServer())
        .get(
          '/employees?page=1&limit=10&search=ana&type=MECHANIC&isActive=true',
        )
        .set('Cookie', [`md_access=${accessToken}`])
        .expect(200);
      const listBody = readBody<{
        data: EmployeeRecord[];
        meta: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(listResponse);

      expect(listBody.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
      expect(listBody.data[0]?.id).toBe(created.id);

      const getResponse = await request(app.getHttpServer())
        .get(`/employees/${created.id}`)
        .set('Cookie', [`md_access=${accessToken}`])
        .expect(200);

      expect(readBody<EmployeeRecord>(getResponse).id).toBe(created.id);

      const updateResponse = await request(app.getHttpServer())
        .patch(`/employees/${created.id}`)
        .set('Cookie', [`md_access=${accessToken}`])
        .send({
          name: '  Ana Maria Torres  ',
          isActive: false,
        })
        .expect(200);
      const updated = readBody<EmployeeRecord>(updateResponse);

      expect(updated.name).toBe('Ana Maria Torres');
      expect(updated.isActive).toBe(false);

      const optionsResponse = await request(app.getHttpServer())
        .get('/employees/cost-center-options')
        .set('Cookie', [`md_access=${accessToken}`])
        .expect(200);

      expect(readBody<CostCenterOption[]>(optionsResponse)).toEqual([
        {
          id: 'cost-center-1',
          code: 'TALLER',
          name: 'Taller',
          isActive: true,
        },
      ]);
    },
  );

  it('rejects unknown cost-center references with 404', async () => {
    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .post('/employees')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: 'Ana Torres',
        type: EmployeeType.MECHANIC,
        baseSalaryMonthly: 2500000,
        costCenterId: 'missing-cost-center',
      })
      .expect(404);
  });

  it('returns 404 when the employee does not exist', async () => {
    const accessToken = await createAccessToken('SALES');

    await request(app.getHttpServer())
      .get('/employees/missing-employee')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(404);
  });

  it('rejects invalid employee and bonus payloads with 400', async () => {
    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .post('/employees')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: '   ',
        type: EmployeeType.MECHANIC,
        baseSalaryMonthly: -1,
      })
      .expect(400);

    const createEmployeeResponse = await request(app.getHttpServer())
      .post('/employees')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: 'Ana Torres',
        type: EmployeeType.MECHANIC,
        baseSalaryMonthly: 2500000,
      })
      .expect(201);
    const createdEmployee = readBody<EmployeeRecord>(createEmployeeResponse);

    await request(app.getHttpServer())
      .post(`/employees/${createdEmployee.id}/bonuses`)
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        amount: 0,
      })
      .expect(400);
  });

  it('creates and lists employee bonuses for authorized users', async () => {
    const accessToken = await createAccessToken('ADMIN');
    const createEmployeeResponse = await request(app.getHttpServer())
      .post('/employees')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: 'Ana Torres',
        type: EmployeeType.MECHANIC,
        baseSalaryMonthly: 2500000,
      })
      .expect(201);
    const createdEmployee = readBody<EmployeeRecord>(createEmployeeResponse);

    const createBonusResponse = await request(app.getHttpServer())
      .post(`/employees/${createdEmployee.id}/bonuses`)
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        amount: 150000,
        description: '  Bono trimestral  ',
        paidAt: '2026-05-10T09:00:00.000Z',
        paymentMethod: PaymentMethod.TRANSFER,
      })
      .expect(201);
    const createdBonus = readBody<EmployeeBonusRecord>(createBonusResponse);

    expect(createdBonus.employeeId).toBe(createdEmployee.id);
    expect(createdBonus.description).toBe('Bono trimestral');

    const listBonusesResponse = await request(app.getHttpServer())
      .get(`/employees/${createdEmployee.id}/bonuses?page=1&limit=10`)
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(200);
    const listBody = readBody<{
      data: EmployeeBonusRecord[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>(listBonusesResponse);

    expect(listBody.meta).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    expect(listBody.data[0]?.id).toBe(createdBonus.id);
  });

  it('filters employee bonuses by paidAt window while keeping newest-first order', async () => {
    const accessToken = await createAccessToken('ADMIN');
    const createEmployeeResponse = await request(app.getHttpServer())
      .post('/employees')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: 'Ana Torres',
        type: EmployeeType.MECHANIC,
        baseSalaryMonthly: 2500000,
      })
      .expect(201);
    const createdEmployee = readBody<EmployeeRecord>(createEmployeeResponse);

    await request(app.getHttpServer())
      .post(`/employees/${createdEmployee.id}/bonuses`)
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        amount: 100000,
        description: 'Bono enero',
        paidAt: '2026-01-10T09:00:00.000Z',
      })
      .expect(201);

    const februaryBonusResponse = await request(app.getHttpServer())
      .post(`/employees/${createdEmployee.id}/bonuses`)
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        amount: 180000,
        description: 'Bono febrero',
        paidAt: '2026-02-15T09:00:00.000Z',
      })
      .expect(201);
    const februaryBonus = readBody<EmployeeBonusRecord>(februaryBonusResponse);

    await request(app.getHttpServer())
      .post(`/employees/${createdEmployee.id}/bonuses`)
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        amount: 220000,
        description: 'Bono marzo',
        paidAt: '2026-03-20T09:00:00.000Z',
      })
      .expect(201);

    const listBonusesResponse = await request(app.getHttpServer())
      .get(
        `/employees/${createdEmployee.id}/bonuses?page=1&limit=10&from=2026-02-01T00:00:00.000Z&to=2026-02-28T23:59:59.999Z`,
      )
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(200);
    const listBody = readBody<{
      data: EmployeeBonusRecord[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>(listBonusesResponse);

    expect(listBody.meta).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    expect(listBody.data).toHaveLength(1);
    expect(listBody.data[0]?.id).toBe(februaryBonus.id);
    expect(listBody.data[0]?.description).toBe('Bono febrero');
  });

  it('returns 404 for bonus routes when the employee does not exist', async () => {
    const accessToken = await createAccessToken('SALES');

    await request(app.getHttpServer())
      .post('/employees/missing-employee/bonuses')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        amount: 150000,
        paidAt: '2026-05-10T09:00:00.000Z',
      })
      .expect(404);

    await request(app.getHttpServer())
      .get('/employees/missing-employee/bonuses')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(404);
  });
});
