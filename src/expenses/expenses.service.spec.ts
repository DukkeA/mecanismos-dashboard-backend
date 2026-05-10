import { NotFoundException } from '@nestjs/common';
import { ExpenseCategory, PaymentMethod } from '../../generated/prisma/enums';
import { ExpensesService } from './expenses.service';
import { ExpensesRepository } from './persistence/expenses.repository';
import type { ExpenseRecord } from './persistence/expenses.repository';

describe('ExpensesService', () => {
  const costCenterRecord: ExpenseRecord['CostCenter'] = {
    id: 'cost-center-1',
    code: 'ADMIN',
    name: 'Administración',
    isActive: true,
    createdAt: new Date('2026-05-10T10:00:00.000Z'),
    updatedAt: new Date('2026-05-10T10:00:00.000Z'),
  };

  const unpaidExpenseRecord: ExpenseRecord = {
    id: 'expense-1',
    name: 'Arriendo mayo',
    category: ExpenseCategory.RENT,
    amount: 1500000,
    expectedAt: new Date('2026-05-15T00:00:00.000Z'),
    paidAt: null,
    paymentMethod: null,
    notes: 'Pago oficina principal',
    costCenterId: 'cost-center-1',
    createdAt: new Date('2026-05-10T10:00:00.000Z'),
    updatedAt: new Date('2026-05-10T10:00:00.000Z'),
    CostCenter: costCenterRecord,
  };

  const paidExpenseRecord: ExpenseRecord = {
    ...unpaidExpenseRecord,
    id: 'expense-2',
    paidAt: new Date('2026-05-16T00:00:00.000Z'),
    paymentMethod: PaymentMethod.TRANSFER,
  };

  const repository = {
    create: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findCostCenterById: jest.fn(),
  } as unknown as jest.Mocked<ExpensesRepository>;

  let service: ExpensesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExpensesService(repository);
  });

  it('creates expenses with trimmed fields and an existing optional cost-center reference', async () => {
    repository.findCostCenterById.mockResolvedValue(costCenterRecord);
    repository.create.mockResolvedValue(unpaidExpenseRecord);

    await expect(
      service.create({
        name: '  Arriendo mayo  ',
        category: ExpenseCategory.RENT,
        amount: 1500000,
        expectedAt: new Date('2026-05-15T00:00:00.000Z'),
        costCenterId: '  cost-center-1  ',
        notes: '  Pago oficina principal  ',
      }),
    ).resolves.toEqual(unpaidExpenseRecord);

    expect(repository.create.mock.calls[0]).toEqual([
      {
        name: 'Arriendo mayo',
        category: ExpenseCategory.RENT,
        amount: 1500000,
        expectedAt: new Date('2026-05-15T00:00:00.000Z'),
        costCenterId: 'cost-center-1',
        paidAt: undefined,
        paymentMethod: null,
        notes: 'Pago oficina principal',
      },
    ]);
  });

  it('returns paginated expenses with pragmatic filters', async () => {
    repository.findMany.mockResolvedValue({
      items: [paidExpenseRecord],
      total: 1,
      page: 1,
      limit: 10,
    });

    await expect(
      service.findAll({
        page: 1,
        limit: 10,
        search: 'arriendo',
        category: ExpenseCategory.RENT,
        isPaid: true,
        costCenterId: 'cost-center-1',
      }),
    ).resolves.toEqual({
      data: [paidExpenseRecord],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('throws NotFoundException when the expense does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('missing-expense')).rejects.toThrow(
      new NotFoundException('Expense missing-expense not found'),
    );
  });

  it('rejects create requests with an unknown cost center', async () => {
    repository.findCostCenterById.mockResolvedValue(null);

    await expect(
      service.create({
        name: 'Arriendo mayo',
        category: ExpenseCategory.RENT,
        amount: 1500000,
        expectedAt: new Date('2026-05-15T00:00:00.000Z'),
        costCenterId: 'missing-cost-center',
      }),
    ).rejects.toThrow(
      new NotFoundException('Cost center missing-cost-center not found'),
    );

    expect(repository.create.mock.calls).toHaveLength(0);
  });

  it('updates expenses from paid to unpaid by clearing payment data', async () => {
    repository.findById.mockResolvedValue(paidExpenseRecord);
    repository.update.mockResolvedValue({
      ...paidExpenseRecord,
      paidAt: null,
      paymentMethod: null,
      notes: 'Reprogramado',
    });

    await expect(
      service.update('expense-2', {
        paidAt: null,
        paymentMethod: null,
        notes: '  Reprogramado  ',
      }),
    ).resolves.toMatchObject({
      id: 'expense-2',
      paidAt: null,
      paymentMethod: null,
      notes: 'Reprogramado',
    });

    expect(repository.update.mock.calls[0]).toEqual([
      'expense-2',
      {
        paidAt: null,
        paymentMethod: null,
        notes: 'Reprogramado',
      },
    ]);
  });

  it('rejects updates with an unknown cost center', async () => {
    repository.findById.mockResolvedValue(unpaidExpenseRecord);
    repository.findCostCenterById.mockResolvedValue(null);

    await expect(
      service.update('expense-1', {
        costCenterId: 'missing-cost-center',
      }),
    ).rejects.toThrow(
      new NotFoundException('Cost center missing-cost-center not found'),
    );

    expect(repository.update.mock.calls).toHaveLength(0);
  });
});
