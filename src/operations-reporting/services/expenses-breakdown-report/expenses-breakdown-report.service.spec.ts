import { ExpenseCategory, PaymentStatus } from '../../../../generated/prisma/enums';
import type { ExpenseReadModel } from '../../persistence/operations-reporting.repository';
import { OperationsReportingRepository } from '../../persistence/operations-reporting.repository';
import { ExpensesBreakdownReportService } from './expenses-breakdown-report.service';

describe('ExpensesBreakdownReportService', () => {
  it('groups paid expenses by paidAt date and pending expenses by expectedAt date with category, state, and cost center breakdowns', async () => {
    const repository = createRepositoryMock({
      paidExpenses: [
        createExpense({
          id: 'expense-1',
          category: ExpenseCategory.RENT,
          amount: 100,
          costCenterId: 'cost-center-1',
          costCenterName: 'Workshop',
          paidAt: '2026-05-02T15:00:00.000Z',
        }),
        createExpense({
          id: 'expense-2',
          category: ExpenseCategory.RENT,
          amount: 150,
          costCenterId: 'cost-center-1',
          costCenterName: 'Workshop',
          paidAt: '2026-05-02T17:00:00.000Z',
        }),
        createExpense({
          id: 'expense-3',
          category: ExpenseCategory.OTHER,
          amount: 80,
          paidAt: '2026-05-03T10:00:00.000Z',
        }),
      ],
      pendingExpenses: [
        createExpense({
          id: 'expense-4',
          category: ExpenseCategory.RENT,
          amount: 200,
          costCenterId: 'cost-center-1',
          costCenterName: 'Workshop',
          expectedAt: '2026-05-02T08:00:00.000Z',
        }),
        createExpense({
          id: 'expense-5',
          category: ExpenseCategory.UTILITY,
          amount: 120,
          costCenterId: 'cost-center-2',
          costCenterName: 'Admin',
          expectedAt: '2026-05-04T09:00:00.000Z',
        }),
      ],
    });
    const service = new ExpensesBreakdownReportService(repository as never);

    await expect(
      service.getReport({
        dateFrom: new Date('2026-05-01T00:00:00.000Z'),
        dateTo: new Date('2026-05-31T23:59:59.000Z'),
      }),
    ).resolves.toEqual({
      approximate: true,
      basis: 'cash-operational',
      window: {
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-05-31T23:59:59.000Z',
      },
      data: [
        {
          period: '2026-05-02',
          expenseCategory: ExpenseCategory.RENT,
          paymentStatus: PaymentStatus.PAID,
          costCenterId: 'cost-center-1',
          costCenterName: 'Workshop',
          totalAmount: 250,
        },
        {
          period: '2026-05-02',
          expenseCategory: ExpenseCategory.RENT,
          paymentStatus: PaymentStatus.PENDING,
          costCenterId: 'cost-center-1',
          costCenterName: 'Workshop',
          totalAmount: 200,
        },
        {
          period: '2026-05-03',
          expenseCategory: ExpenseCategory.OTHER,
          paymentStatus: PaymentStatus.PAID,
          costCenterId: null,
          costCenterName: null,
          totalAmount: 80,
        },
        {
          period: '2026-05-04',
          expenseCategory: ExpenseCategory.UTILITY,
          paymentStatus: PaymentStatus.PENDING,
          costCenterId: 'cost-center-2',
          costCenterName: 'Admin',
          totalAmount: 120,
        },
      ],
    });

    expect(repository.findPaidExpenses).toHaveBeenCalledWith({
      dateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dateTo: new Date('2026-05-31T23:59:59.000Z'),
    });
    expect(repository.findPendingExpenses).toHaveBeenCalledWith({
      dateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dateTo: new Date('2026-05-31T23:59:59.000Z'),
    });
  });

  it('uses the paymentStatus route filter to query only the requested expense state', async () => {
    const repository = createRepositoryMock({
      paidExpenses: [
        createExpense({
          id: 'expense-6',
          category: ExpenseCategory.RENT,
          amount: 300,
          costCenterId: 'cost-center-3',
          costCenterName: 'Sales',
          paidAt: '2026-05-07T12:00:00.000Z',
        }),
      ],
      pendingExpenses: [
        createExpense({
          id: 'expense-7',
          category: ExpenseCategory.UTILITY,
          amount: 500,
          costCenterId: 'cost-center-3',
          costCenterName: 'Sales',
          expectedAt: '2026-05-09T12:00:00.000Z',
        }),
      ],
    });
    const service = new ExpensesBreakdownReportService(repository as never);

    await expect(
      service.getReport({
        dateFrom: new Date('2026-05-01T00:00:00.000Z'),
        dateTo: new Date('2026-05-31T23:59:59.000Z'),
        costCenterId: 'cost-center-3',
        expenseCategory: ExpenseCategory.RENT,
        paymentStatus: PaymentStatus.PAID,
      }),
    ).resolves.toMatchObject({
      data: [
        {
          period: '2026-05-07',
          expenseCategory: ExpenseCategory.RENT,
          paymentStatus: PaymentStatus.PAID,
          costCenterId: 'cost-center-3',
          totalAmount: 300,
        },
      ],
    });

    expect(repository.findPaidExpenses).toHaveBeenCalledWith({
      dateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dateTo: new Date('2026-05-31T23:59:59.000Z'),
      costCenterId: 'cost-center-3',
      expenseCategory: ExpenseCategory.RENT,
    });
    expect(repository.findPendingExpenses).not.toHaveBeenCalled();
  });

  it('uses the pending paymentStatus filter to exclude paid expenses from the breakdown', async () => {
    const repository = createRepositoryMock({
      paidExpenses: [
        createExpense({
          id: 'expense-8',
          category: ExpenseCategory.RENT,
          amount: 999,
          costCenterId: 'cost-center-4',
          costCenterName: 'Operations',
          paidAt: '2026-05-10T12:00:00.000Z',
        }),
      ],
      pendingExpenses: [
        createExpense({
          id: 'expense-9',
          category: ExpenseCategory.UTILITY,
          amount: 410,
          costCenterId: 'cost-center-4',
          costCenterName: 'Operations',
          expectedAt: '2026-05-11T12:00:00.000Z',
        }),
      ],
    });
    const service = new ExpensesBreakdownReportService(repository as never);

    await expect(
      service.getReport({
        paymentStatus: PaymentStatus.PENDING,
      }),
    ).resolves.toMatchObject({
      data: [
        {
          period: '2026-05-11',
          expenseCategory: ExpenseCategory.UTILITY,
          paymentStatus: PaymentStatus.PENDING,
          costCenterId: 'cost-center-4',
          totalAmount: 410,
        },
      ],
      window: {
        dateFrom: null,
        dateTo: null,
      },
    });

    expect(repository.findPaidExpenses).not.toHaveBeenCalled();
    expect(repository.findPendingExpenses).toHaveBeenCalledWith({
      dateFrom: undefined,
      dateTo: undefined,
      costCenterId: undefined,
      expenseCategory: undefined,
    });
  });
});

function createRepositoryMock({
  paidExpenses = [],
  pendingExpenses = [],
}: {
  paidExpenses?: ExpenseReadModel[];
  pendingExpenses?: ExpenseReadModel[];
}): jest.Mocked<Pick<OperationsReportingRepository, 'findPaidExpenses' | 'findPendingExpenses'>> {
  return {
    findPaidExpenses: jest.fn().mockResolvedValue(paidExpenses),
    findPendingExpenses: jest.fn().mockResolvedValue(pendingExpenses),
  };
}

function createExpense({
  id,
  category,
  amount,
  costCenterId = null,
  costCenterName = null,
  expectedAt = '2026-05-01T00:00:00.000Z',
  paidAt = null,
}: {
  id: string;
  category: ExpenseCategory;
  amount: number;
  costCenterId?: string | null;
  costCenterName?: string | null;
  expectedAt?: string;
  paidAt?: string | null;
}): ExpenseReadModel {
  return {
    id,
    name: `Expense ${id}`,
    category,
    amount,
    costCenterId,
    expectedAt: new Date(expectedAt),
    paidAt: paidAt ? new Date(paidAt) : null,
    CostCenter: costCenterId
      ? {
          id: costCenterId,
          code: costCenterId.toUpperCase(),
          name: costCenterName ?? costCenterId,
        }
      : null,
  };
}
