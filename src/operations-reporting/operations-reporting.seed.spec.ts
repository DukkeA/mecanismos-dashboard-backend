import type {
  CostCenter,
  Expense,
  Prisma,
} from '../../generated/prisma/client';
import {
  ExpenseCategory,
  PaymentMethod,
  PaymentStatus,
} from '../../generated/prisma/enums';
import {
  type ExpenseSeedPrismaClient,
  seedExpenses,
} from '../../prisma/seed-expenses';
import {
  type WorkOrderSeedPrismaTransactionClient,
  type WorkOrderSeedPrismaClient,
  seedWorkOrders,
} from '../../prisma/seed-work-orders';

type CostCenterFindUniqueArgs = Prisma.CostCenterFindUniqueArgs;
type ExpenseUpsertArgs = Prisma.ExpenseUpsertArgs;
type WorkOrderUpsertArgs = Prisma.WorkOrderUpsertArgs;
type WorkshopWorkOrderDetailsCreateManyArgs =
  Prisma.WorkshopWorkOrderDetailsCreateManyArgs;
type WorkOrderEstimateUpsertArgs = Prisma.WorkOrderEstimateUpsertArgs;
type WorkOrderActualCostCreateManyArgs =
  Prisma.WorkOrderActualCostCreateManyArgs;
type WorkOrderPaymentCreateManyArgs = Prisma.WorkOrderPaymentCreateManyArgs;

void (seedWorkOrders satisfies (
  prisma: WorkOrderSeedPrismaClient,
  now: Date,
) => Promise<void>);
void (seedExpenses satisfies (
  prisma: ExpenseSeedPrismaClient,
  now: Date,
) => Promise<void>);

describe('operations-reporting seed fixtures', () => {
  it('adds stable partial-payment and unknown-payable work orders for report reviewers', async () => {
    const workOrderUpsert = jest
      .fn<Promise<unknown>, [WorkOrderUpsertArgs]>()
      .mockResolvedValue(undefined);
    const workshopDetailsCreateMany = jest
      .fn<Promise<unknown>, [WorkshopWorkOrderDetailsCreateManyArgs]>()
      .mockResolvedValue(undefined);
    const estimateUpsert = jest
      .fn<Promise<unknown>, [WorkOrderEstimateUpsertArgs]>()
      .mockResolvedValue(undefined);
    const actualCostCreateMany = jest
      .fn<Promise<unknown>, [WorkOrderActualCostCreateManyArgs]>()
      .mockResolvedValue(undefined);
    const paymentCreateMany = jest
      .fn<Promise<unknown>, [WorkOrderPaymentCreateManyArgs]>()
      .mockResolvedValue(undefined);

    const transactionClient = {
      workOrder: { upsert: workOrderUpsert },
      workshopWorkOrderDetails: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        createMany: workshopDetailsCreateMany,
      },
      workOrderEstimate: { upsert: estimateUpsert },
      workOrderEstimateLine: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        createMany: jest.fn().mockResolvedValue(undefined),
      },
      workOrderActualCost: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        createMany: actualCostCreateMany,
      },
      workOrderPayment: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        createMany: paymentCreateMany,
      },
      inventoryMovement: {
        updateMany: jest.fn().mockResolvedValue(undefined),
      },
      supplierQuoteHistory: {
        updateMany: jest.fn().mockResolvedValue(undefined),
      },
    };

    const prisma: WorkOrderSeedPrismaClient = {
      $transaction: async <T>(
        callback: (
          transaction: WorkOrderSeedPrismaTransactionClient,
        ) => Promise<T>,
      ) => callback(transactionClient),
    };

    await seedWorkOrders(prisma, new Date('2026-05-10T12:00:00.000Z'));

    const partialWorkOrderUpsert = workOrderUpsert.mock.calls.find(
      ([args]) => args.where.id === 'seed-work-order-workshop-partial-payment',
    )?.[0];
    const unknownPayableWorkOrderUpsert = workOrderUpsert.mock.calls.find(
      ([args]) => args.where.id === 'seed-work-order-workshop-unknown-payable',
    )?.[0];
    expect(partialWorkOrderUpsert?.create).toMatchObject({
      paymentStatus: PaymentStatus.PARTIAL,
      assignedEmployeeId: 'seed-employee-ana-torres',
    });
    expect(unknownPayableWorkOrderUpsert?.create).toMatchObject({
      paymentStatus: PaymentStatus.PARTIAL,
      assignedEmployeeId: 'seed-employee-ana-torres',
    });

    const workshopDetailsArgs = workshopDetailsCreateMany.mock.calls[0]?.[0];
    expect(workshopDetailsArgs?.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          workOrderId: 'seed-work-order-workshop-partial-payment',
        }),
        expect.objectContaining({
          workOrderId: 'seed-work-order-workshop-unknown-payable',
        }),
      ]),
    );

    const partialEstimateUpsert = estimateUpsert.mock.calls.find(
      ([args]) => args.where.id === 'seed-work-order-estimate-partial-final',
    )?.[0];
    expect(partialEstimateUpsert?.create).toMatchObject({
      workOrderId: 'seed-work-order-workshop-partial-payment',
      totalPriceAmount: 250000,
    });

    const actualCostArgs = actualCostCreateMany.mock.calls[0]?.[0];
    expect(actualCostArgs?.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'seed-work-order-actual-cost-partial-outsourced',
          workOrderId: 'seed-work-order-workshop-partial-payment',
          amount: 110000,
        }),
        expect.objectContaining({
          id: 'seed-work-order-actual-cost-unknown-outsourced',
          workOrderId: 'seed-work-order-workshop-unknown-payable',
          amount: 70000,
        }),
      ]),
    );

    const paymentArgs = paymentCreateMany.mock.calls[0]?.[0];
    expect(paymentArgs?.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'seed-work-order-payment-partial-advance',
          workOrderId: 'seed-work-order-workshop-partial-payment',
          amount: 100000,
          paymentMethod: PaymentMethod.CASH,
        }),
        expect.objectContaining({
          id: 'seed-work-order-payment-unknown-advance',
          workOrderId: 'seed-work-order-workshop-unknown-payable',
          amount: 30000,
          paymentMethod: PaymentMethod.TRANSFER,
        }),
      ]),
    );
  });

  it('reuses stable paid and unpaid expenses for report breakdown reviewers', async () => {
    const findUnique = jest
      .fn<Promise<Pick<CostCenter, 'id'> | null>, [CostCenterFindUniqueArgs]>()
      .mockImplementation(({ where }) => {
        if (where.code === 'GENERAL') {
          return Promise.resolve({ id: 'cost-center-general' });
        }

        if (where.code === 'OFICINA') {
          return Promise.resolve({ id: 'cost-center-oficina' });
        }

        return Promise.resolve(null);
      });
    const expenseUpsert = jest
      .fn<Promise<Expense>, [ExpenseUpsertArgs]>()
      .mockResolvedValue({} as Expense);

    await seedExpenses(
      {
        costCenter: { findUnique },
        expense: { upsert: expenseUpsert },
      },
      new Date('2026-05-10T12:00:00.000Z'),
    );

    const rentExpenseUpsert = expenseUpsert.mock.calls.find(
      ([args]) => args.where.id === 'seed-expense-rent-may',
    )?.[0];
    const utilityExpenseUpsert = expenseUpsert.mock.calls.find(
      ([args]) => args.where.id === 'seed-expense-utility-power-april',
    )?.[0];
    expect(rentExpenseUpsert?.create).toMatchObject({
      category: ExpenseCategory.RENT,
      paidAt: null,
      costCenterId: 'cost-center-oficina',
    });
    expect(utilityExpenseUpsert?.create).toMatchObject({
      category: ExpenseCategory.UTILITY,
      paymentMethod: PaymentMethod.TRANSFER,
      costCenterId: 'cost-center-general',
    });
  });
});
