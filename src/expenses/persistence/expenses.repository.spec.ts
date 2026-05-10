import {
  ExpenseCategory,
  PaymentMethod,
} from '../../../generated/prisma/enums';
import { ExpensesRepository } from './expenses.repository';

describe('ExpensesRepository', () => {
  it('creates expenses with trimmed optional fields and CostCenter include', async () => {
    const createdExpense = {
      id: 'expense-1',
      name: 'Arriendo mayo',
      category: ExpenseCategory.RENT,
      amount: 1500000,
      costCenterId: 'cost-center-1',
      expectedAt: new Date('2026-05-15T00:00:00.000Z'),
      paidAt: new Date('2026-05-16T00:00:00.000Z'),
      paymentMethod: PaymentMethod.TRANSFER,
      notes: 'Pago oficina',
      createdAt: new Date('2026-05-09T12:00:00.000Z'),
      updatedAt: new Date('2026-05-09T12:00:00.000Z'),
      CostCenter: {
        id: 'cost-center-1',
        code: 'ADMIN',
        name: 'Administración',
        isActive: true,
      },
    };
    type CreateArgs = {
      data: {
        id: string;
        name: string;
        category: ExpenseCategory;
        amount: number;
        expectedAt: Date;
        paidAt: Date | null;
        paymentMethod: PaymentMethod | null;
        notes: string | null;
        CostCenter: { connect: { id: string } };
        updatedAt: Date;
      };
      include: { CostCenter: true };
    };

    let receivedCreateArgs: CreateArgs | undefined;

    const prisma = {
      expense: {
        create: jest.fn((args: CreateArgs) => {
          receivedCreateArgs = args;

          return Promise.resolve(createdExpense);
        }),
      },
    };

    const repository = new ExpensesRepository(prisma as never);

    await expect(
      repository.create({
        name: ' Arriendo mayo ',
        category: ExpenseCategory.RENT,
        amount: 1500000,
        expectedAt: new Date('2026-05-15T00:00:00.000Z'),
        paidAt: new Date('2026-05-16T00:00:00.000Z'),
        paymentMethod: PaymentMethod.TRANSFER,
        costCenterId: ' cost-center-1 ',
        notes: ' Pago oficina ',
      }),
    ).resolves.toEqual(createdExpense);

    expect(receivedCreateArgs?.data.id).toEqual(expect.any(String));
    expect(receivedCreateArgs?.data.name).toBe('Arriendo mayo');
    expect(receivedCreateArgs?.data.notes).toBe('Pago oficina');
    expect(receivedCreateArgs?.data.CostCenter).toEqual({
      connect: { id: 'cost-center-1' },
    });
    expect(receivedCreateArgs?.include).toEqual({ CostCenter: true });
  });

  it('builds paginated filters for search, category, cost center, paid state, and date windows', async () => {
    type FindManyArgs = {
      where: Record<string, unknown>;
      include: { CostCenter: true };
      orderBy: { expectedAt: 'desc' };
      skip: number;
      take: number;
    };
    type CountArgs = { where: Record<string, unknown> };

    let receivedFindManyArgs: FindManyArgs | undefined;
    let receivedCountArgs: CountArgs | undefined;

    const prisma = {
      expense: {
        findMany: jest.fn((args: FindManyArgs) => {
          receivedFindManyArgs = args;

          return Promise.resolve([]);
        }),
        count: jest.fn((args: CountArgs) => {
          receivedCountArgs = args;

          return Promise.resolve(0);
        }),
      },
    };

    const repository = new ExpensesRepository(prisma as never);

    await repository.findMany({
      page: 2,
      limit: 5,
      search: '  oficina  ',
      category: ExpenseCategory.UTILITY,
      costCenterId: '  cost-center-1  ',
      isPaid: true,
      expectedFrom: new Date('2026-05-01T00:00:00.000Z'),
      expectedTo: new Date('2026-05-31T23:59:59.000Z'),
      paidFrom: new Date('2026-05-10T00:00:00.000Z'),
      paidTo: new Date('2026-05-20T23:59:59.000Z'),
    });

    expect(receivedFindManyArgs).toEqual({
      where: {
        category: ExpenseCategory.UTILITY,
        costCenterId: 'cost-center-1',
        paidAt: {
          not: null,
          gte: new Date('2026-05-10T00:00:00.000Z'),
          lte: new Date('2026-05-20T23:59:59.000Z'),
        },
        expectedAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.000Z'),
        },
        OR: [
          { name: { contains: 'oficina', mode: 'insensitive' } },
          { notes: { contains: 'oficina', mode: 'insensitive' } },
        ],
      },
      include: { CostCenter: true },
      orderBy: { expectedAt: 'desc' },
      skip: 5,
      take: 5,
    });
    expect(receivedCountArgs).toEqual({
      where: {
        category: ExpenseCategory.UTILITY,
        costCenterId: 'cost-center-1',
        paidAt: {
          not: null,
          gte: new Date('2026-05-10T00:00:00.000Z'),
          lte: new Date('2026-05-20T23:59:59.000Z'),
        },
        expectedAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.000Z'),
        },
        OR: [
          { name: { contains: 'oficina', mode: 'insensitive' } },
          { notes: { contains: 'oficina', mode: 'insensitive' } },
        ],
      },
    });
  });

  it('finds expenses and cost centers by id with CostCenter relation included', async () => {
    type ExpenseFindUniqueArgs = {
      where: { id: string };
      include: { CostCenter: true };
    };
    type CostCenterFindUniqueArgs = { where: { id: string } };

    let receivedExpenseArgs: ExpenseFindUniqueArgs | undefined;
    let receivedCostCenterArgs: CostCenterFindUniqueArgs | undefined;

    const prisma = {
      expense: {
        findUnique: jest.fn((args: ExpenseFindUniqueArgs) => {
          receivedExpenseArgs = args;

          return Promise.resolve({ id: 'expense-1', CostCenter: null });
        }),
      },
      costCenter: {
        findUnique: jest.fn((args: CostCenterFindUniqueArgs) => {
          receivedCostCenterArgs = args;

          return Promise.resolve({ id: 'cost-center-1' });
        }),
      },
    };

    const repository = new ExpensesRepository(prisma as never);

    await expect(repository.findById('expense-1')).resolves.toEqual({
      id: 'expense-1',
      CostCenter: null,
    });
    await expect(
      repository.findCostCenterById('cost-center-1'),
    ).resolves.toEqual({
      id: 'cost-center-1',
    });

    expect(receivedExpenseArgs).toEqual({
      where: { id: 'expense-1' },
      include: { CostCenter: true },
    });
    expect(receivedCostCenterArgs).toEqual({
      where: { id: 'cost-center-1' },
    });
  });

  it('updates trimmed values, paid fields, and cost-center disconnects', async () => {
    type UpdateArgs = {
      where: { id: string };
      data: Record<string, unknown>;
      include: { CostCenter: true };
    };

    let receivedUpdateArgs: UpdateArgs | undefined;

    const prisma = {
      expense: {
        update: jest.fn((args: UpdateArgs) => {
          receivedUpdateArgs = args;

          return Promise.resolve({ id: 'expense-1' });
        }),
      },
    };

    const repository = new ExpensesRepository(prisma as never);

    await repository.update('expense-1', {
      name: ' Almuerzo equipo ',
      paidAt: new Date('2026-05-12T12:00:00.000Z'),
      paymentMethod: PaymentMethod.CARD,
      costCenterId: '',
      notes: '  Caja menor  ',
    });

    expect(receivedUpdateArgs?.where).toEqual({ id: 'expense-1' });
    expect(receivedUpdateArgs?.data).toMatchObject({
      name: 'Almuerzo equipo',
      paidAt: new Date('2026-05-12T12:00:00.000Z'),
      paymentMethod: PaymentMethod.CARD,
      notes: 'Caja menor',
      CostCenter: { disconnect: true },
    });
    expect(receivedUpdateArgs?.data.updatedAt).toEqual(expect.any(Date));
    expect(receivedUpdateArgs?.include).toEqual({ CostCenter: true });
  });
});
