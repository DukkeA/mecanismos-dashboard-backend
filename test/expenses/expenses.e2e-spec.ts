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
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { ExpenseCategory, PaymentMethod } from '../../generated/prisma/enums';
import { AppModule } from '../../src/app.module';
import type { LexicalNoteJson } from '../../src/common/rich-text/lexical-note';
import { ExpensesService } from '../../src/expenses/expenses.service';
import { authJwtPayloadForRole } from '../support/auth-prisma-mock';
import { lexicalTestNote } from '../support/lexical-note';

type CostCenterOption = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

type ExpensePayload = {
  name: string;
  category: ExpenseCategory;
  amount: number;
  expectedAt: string | Date | null;
  costCenterId?: string | null;
  paidAt?: string | Date | null;
  paymentMethod?: PaymentMethod | null;
  notes?: LexicalNoteJson | null;
};

type ExpenseRecord = {
  id: string;
  name: string;
  category: ExpenseCategory;
  amount: number;
  expectedAt: string;
  costCenterId: string | null;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  notes: LexicalNoteJson | null;
  createdAt: string;
  updatedAt: string;
  CostCenter: CostCenterOption | null;
};

function buildExpensesServiceOverride() {
  const expenses = new Map<string, ExpenseRecord>();
  const costCenters = new Map<string, CostCenterOption>([
    [
      'cost-center-1',
      {
        id: 'cost-center-1',
        code: 'ADMIN',
        name: 'Administración',
        isActive: true,
      },
    ],
  ]);
  let sequence = 0;

  function ensureCostCenterExists(costCenterId?: string | null) {
    if (!costCenterId) {
      return null;
    }

    const costCenter = costCenters.get(costCenterId.trim());

    if (!costCenter) {
      throw new NotFoundException(
        `Cost center ${costCenterId.trim()} not found`,
      );
    }

    return costCenter;
  }

  function assertPaymentConsistency(payload: {
    paidAt?: string | Date | null;
    paymentMethod?: PaymentMethod | null;
  }) {
    if (!payload.paidAt && payload.paymentMethod) {
      throw new BadRequestException('paymentMethod requires paidAt');
    }
  }

  function buildExpenseRecord(
    payload: ExpensePayload,
    id: string,
    createdAt: string = new Date('2026-05-10T10:00:00.000Z').toISOString(),
  ): ExpenseRecord {
    const costCenter = ensureCostCenterExists(payload.costCenterId);
    const paidAt = payload.paidAt
      ? new Date(payload.paidAt).toISOString()
      : null;

    return {
      id,
      name: payload.name.trim(),
      category: payload.category,
      amount: payload.amount,
      expectedAt: new Date(payload.expectedAt as string | Date).toISOString(),
      costCenterId: payload.costCenterId?.trim() ?? null,
      paidAt,
      paymentMethod: paidAt ? (payload.paymentMethod ?? null) : null,
      notes: payload.notes ?? null,
      createdAt,
      updatedAt: new Date('2026-05-10T11:00:00.000Z').toISOString(),
      CostCenter: costCenter,
    };
  }

  return {
    create(payload: ExpensePayload) {
      assertPaymentConsistency(payload);
      const record = buildExpenseRecord(payload, `expense-${++sequence}`);

      expenses.set(record.id, record);

      return record;
    },

    findAll(query: {
      page?: number;
      limit?: number;
      search?: string;
      category?: ExpenseCategory;
      costCenterId?: string;
      isPaid?: boolean;
    }) {
      const page = query.page ?? 1;
      const limit = query.limit ?? 10;
      const search = query.search?.toLowerCase();

      const filtered = [...expenses.values()].filter((expense) => {
        if (query.category && expense.category !== query.category) {
          return false;
        }

        if (
          query.costCenterId !== undefined &&
          expense.costCenterId !== query.costCenterId
        ) {
          return false;
        }

        if (
          query.isPaid !== undefined &&
          Boolean(expense.paidAt) !== query.isPaid
        ) {
          return false;
        }

        if (!search) {
          return true;
        }

        return expense.name.toLowerCase().includes(search);
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
      const expense = expenses.get(id);

      if (!expense) {
        throw new NotFoundException(`Expense ${id} not found`);
      }

      return expense;
    },

    update(id: string, payload: Partial<ExpensePayload>) {
      const current = expenses.get(id);

      if (!current) {
        throw new NotFoundException(`Expense ${id} not found`);
      }

      const nextPayload: ExpensePayload = {
        ...current,
        ...payload,
        expectedAt: payload.expectedAt ?? current.expectedAt,
        paidAt:
          payload.paidAt === undefined
            ? current.paidAt
            : (payload.paidAt ?? null),
        paymentMethod:
          payload.paidAt === null
            ? null
            : payload.paymentMethod === undefined
              ? current.paymentMethod
              : payload.paymentMethod,
      };

      assertPaymentConsistency(nextPayload);
      const record = buildExpenseRecord(nextPayload, id, current.createdAt);

      expenses.set(id, record);

      return record;
    },
  };
}

describe('ExpensesController (e2e)', () => {
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
      .overrideProvider(ExpensesService)
      .useValue(buildExpensesServiceOverride())
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

  it('rejects unauthenticated expense listing', async () => {
    await request(app.getHttpServer()).get('/expenses').expect(401);
  });

  it('rejects authenticated MECHANIC expense listing', async () => {
    const accessToken = await createAccessToken('MECHANIC');

    await request(app.getHttpServer())
      .get('/expenses')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(403);
  });

  it.each(['ADMIN', 'SALES'] as const)(
    'allows authenticated %s users to create, list, get, and update expenses',
    async (role) => {
      const accessToken = await createAccessToken(role);
      const createResponse = await request(app.getHttpServer())
        .post('/expenses')
        .set('Cookie', [`md_access=${accessToken}`])
        .send({
          name: '  Arriendo mayo  ',
          category: ExpenseCategory.RENT,
          amount: 1500000,
          expectedAt: '2026-05-15T00:00:00.000Z',
          paidAt: '2026-05-16T00:00:00.000Z',
          paymentMethod: PaymentMethod.TRANSFER,
          costCenterId: 'cost-center-1',
          notes: lexicalTestNote('Pago oficina principal'),
        })
        .expect(201);
      const created = readBody<ExpenseRecord>(createResponse);

      expect(created.name).toBe('Arriendo mayo');
      expect(created.paymentMethod).toBe(PaymentMethod.TRANSFER);
      expect(created.CostCenter?.id).toBe('cost-center-1');

      const listResponse = await request(app.getHttpServer())
        .get(
          '/expenses?page=1&limit=10&search=arriendo&category=RENT&costCenterId=cost-center-1&isPaid=true',
        )
        .set('Cookie', [`md_access=${accessToken}`])
        .expect(200);
      const listBody = readBody<{
        data: ExpenseRecord[];
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
        .get(`/expenses/${created.id}`)
        .set('Cookie', [`md_access=${accessToken}`])
        .expect(200);

      expect(readBody<ExpenseRecord>(getResponse).id).toBe(created.id);

      const updateResponse = await request(app.getHttpServer())
        .patch(`/expenses/${created.id}`)
        .set('Cookie', [`md_access=${accessToken}`])
        .send({
          paidAt: null,
          paymentMethod: null,
          notes: lexicalTestNote('Reprogramado para caja semanal'),
        })
        .expect(200);
      const updated = readBody<ExpenseRecord>(updateResponse);

      expect(updated.paidAt).toBeNull();
      expect(updated.paymentMethod).toBeNull();
      expect(updated.notes).toEqual(
        lexicalTestNote('Reprogramado para caja semanal'),
      );
    },
  );

  it('creates an expense without cost center and keeps the response unassociated', async () => {
    const accessToken = await createAccessToken('ADMIN');
    const createResponse = await request(app.getHttpServer())
      .post('/expenses')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: 'Caja menor semanal',
        category: ExpenseCategory.OTHER,
        amount: 85000,
        expectedAt: '2026-05-18T00:00:00.000Z',
        notes: lexicalTestNote('Sin centro de costo'),
      })
      .expect(201);
    const created = readBody<ExpenseRecord>(createResponse);

    expect(created.costCenterId).toBeNull();
    expect(created.CostCenter).toBeNull();

    const getResponse = await request(app.getHttpServer())
      .get(`/expenses/${created.id}`)
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(200);

    expect(readBody<ExpenseRecord>(getResponse)).toMatchObject({
      id: created.id,
      costCenterId: null,
      CostCenter: null,
    });
  });

  it('rejects unknown cost-center references with 404', async () => {
    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .post('/expenses')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: 'Arriendo mayo',
        category: ExpenseCategory.RENT,
        amount: 1500000,
        expectedAt: '2026-05-15T00:00:00.000Z',
        costCenterId: 'missing-cost-center',
      })
      .expect(404);
  });

  it('returns 404 when the expense does not exist', async () => {
    const accessToken = await createAccessToken('SALES');

    await request(app.getHttpServer())
      .get('/expenses/missing-expense')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(404);
  });

  it('rejects unpaid payment methods with 400', async () => {
    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .post('/expenses')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: 'Arriendo mayo',
        category: ExpenseCategory.RENT,
        amount: 1500000,
        expectedAt: '2026-05-15T00:00:00.000Z',
        paymentMethod: PaymentMethod.CARD,
      })
      .expect(400);
  });
});
