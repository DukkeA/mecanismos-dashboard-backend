import {
  EmployeeType,
  EstimatePhase,
  ExpenseCategory,
  PaymentStatus,
  WorkOrderStatus,
} from '../../../generated/prisma/enums';
import { OperationsReportingRepository } from './operations-reporting.repository';

describe('OperationsReportingRepository', () => {
  it('filters summary work orders by inclusive createdAt window and optional statuses', async () => {
    type FindManyArgs = {
      where: Record<string, unknown>;
      select: Record<string, unknown>;
    };

    let receivedArgs: FindManyArgs | undefined;

    const prisma = {
      workOrder: {
        findMany: jest.fn((args: FindManyArgs) => {
          receivedArgs = args;

          return Promise.resolve([]);
        }),
      },
    };

    const repository = new OperationsReportingRepository(prisma as never);

    await repository.findSummaryWorkOrders({
      dateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dateTo: new Date('2026-05-31T23:59:59.000Z'),
      status: WorkOrderStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
    });

    expect(receivedArgs).toEqual({
      where: {
        createdAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.000Z'),
        },
        status: WorkOrderStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
      },
    });
  });

  it('reads financial work orders with metric-specific inclusive nested windows', async () => {
    type FindManyArgs = {
      where: Record<string, unknown>;
      orderBy: { number: 'desc' };
      select: Record<string, unknown>;
    };

    let receivedArgs: FindManyArgs | undefined;

    const prisma = {
      workOrder: {
        findMany: jest.fn((args: FindManyArgs) => {
          receivedArgs = args;

          return Promise.resolve([]);
        }),
      },
    };

    const repository = new OperationsReportingRepository(prisma as never);

    await repository.findWorkOrdersWithFinancials({
      dateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dateTo: new Date('2026-05-31T23:59:59.000Z'),
      customerId: 'customer-1',
      assignedEmployeeId: 'employee-1',
      status: WorkOrderStatus.IN_PROGRESS,
      paymentStatus: PaymentStatus.PARTIAL,
    });

    expect(receivedArgs).toEqual({
      where: {
        createdAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.000Z'),
        },
        customerId: 'customer-1',
        assignedEmployeeId: 'employee-1',
        status: WorkOrderStatus.IN_PROGRESS,
        paymentStatus: PaymentStatus.PARTIAL,
      },
      orderBy: { number: 'desc' },
      select: {
        id: true,
        number: true,
        createdAt: true,
        status: true,
        paymentStatus: true,
        customerId: true,
        assignedEmployeeId: true,
        Customer: { select: { id: true, name: true } },
        Vehicle: {
          select: { id: true, brand: true, modelReference: true, plate: true },
        },
        Component: {
          select: { id: true, brand: true, reference: true, identifier: true },
        },
        Employee: {
          select: { id: true, name: true, type: true, isActive: true },
        },
        WorkOrderEstimate: {
          select: { phase: true, totalPriceAmount: true },
          orderBy: { createdAt: 'asc' },
        },
        WorkOrderPayment: {
          where: {
            paidAt: {
              gte: new Date('2026-05-01T00:00:00.000Z'),
              lte: new Date('2026-05-31T23:59:59.000Z'),
            },
          },
          select: { id: true, amount: true, paidAt: true },
          orderBy: { paidAt: 'asc' },
        },
        WorkOrderActualCost: {
          where: {
            incurredAt: {
              gte: new Date('2026-05-01T00:00:00.000Z'),
              lte: new Date('2026-05-31T23:59:59.000Z'),
            },
          },
          select: { id: true, amount: true, category: true, incurredAt: true },
          orderBy: { incurredAt: 'asc' },
        },
      },
    });
  });

  it('reads only mechanic employees and their assigned work orders', async () => {
    type FindManyArgs = {
      where: Record<string, unknown>;
      orderBy: { name: 'asc' };
      select: Record<string, unknown>;
    };

    let receivedArgs: FindManyArgs | undefined;

    const prisma = {
      employee: {
        findMany: jest.fn((args: FindManyArgs) => {
          receivedArgs = args;

          return Promise.resolve([]);
        }),
      },
    };

    const repository = new OperationsReportingRepository(prisma as never);

    await repository.findMechanicsWithAssignments({
      dateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dateTo: new Date('2026-05-31T23:59:59.000Z'),
      assignedEmployeeId: 'employee-1',
    });

    expect(receivedArgs).toEqual({
      where: {
        id: 'employee-1',
        type: EmployeeType.MECHANIC,
        isActive: true,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
        WorkOrder: {
          where: {
            createdAt: {
              gte: new Date('2026-05-01T00:00:00.000Z'),
              lte: new Date('2026-05-31T23:59:59.000Z'),
            },
          },
          orderBy: { number: 'desc' },
          select: {
            id: true,
            number: true,
            status: true,
            paymentStatus: true,
            WorkOrderEstimate: {
              select: { phase: true, totalPriceAmount: true },
              orderBy: { createdAt: 'asc' },
            },
            WorkOrderPayment: {
              where: {
                paidAt: {
                  gte: new Date('2026-05-01T00:00:00.000Z'),
                  lte: new Date('2026-05-31T23:59:59.000Z'),
                },
              },
              select: { id: true, amount: true, paidAt: true },
              orderBy: { paidAt: 'asc' },
            },
            WorkOrderActualCost: {
              where: {
                incurredAt: {
                  gte: new Date('2026-05-01T00:00:00.000Z'),
                  lte: new Date('2026-05-31T23:59:59.000Z'),
                },
              },
              select: {
                id: true,
                amount: true,
                category: true,
                incurredAt: true,
              },
              orderBy: { incurredAt: 'asc' },
            },
          },
        },
      },
    });
  });

  it('filters paid expenses by inclusive paidAt window', async () => {
    type FindManyArgs = {
      where: Record<string, unknown>;
      orderBy: { paidAt: 'asc' };
      select: Record<string, unknown>;
    };

    let receivedArgs: FindManyArgs | undefined;

    const prisma = {
      expense: {
        findMany: jest.fn((args: FindManyArgs) => {
          receivedArgs = args;

          return Promise.resolve([]);
        }),
      },
    };

    const repository = new OperationsReportingRepository(prisma as never);

    await repository.findPaidExpenses({
      dateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dateTo: new Date('2026-05-31T23:59:59.000Z'),
      costCenterId: 'cost-center-1',
      expenseCategory: ExpenseCategory.RENT,
    });

    expect(receivedArgs).toEqual({
      where: {
        costCenterId: 'cost-center-1',
        category: ExpenseCategory.RENT,
        paidAt: {
          not: null,
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.000Z'),
        },
      },
      orderBy: { paidAt: 'asc' },
      select: {
        id: true,
        name: true,
        category: true,
        amount: true,
        costCenterId: true,
        expectedAt: true,
        paidAt: true,
        CostCenter: { select: { id: true, code: true, name: true } },
      },
    });
  });

  it('filters pending expenses by null paidAt and inclusive expectedAt window', async () => {
    type FindManyArgs = {
      where: Record<string, unknown>;
      orderBy: { expectedAt: 'asc' };
      select: Record<string, unknown>;
    };

    let receivedArgs: FindManyArgs | undefined;

    const prisma = {
      expense: {
        findMany: jest.fn((args: FindManyArgs) => {
          receivedArgs = args;

          return Promise.resolve([]);
        }),
      },
    };

    const repository = new OperationsReportingRepository(prisma as never);

    await repository.findPendingExpenses({
      dateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dateTo: new Date('2026-05-31T23:59:59.000Z'),
      costCenterId: 'cost-center-1',
      expenseCategory: ExpenseCategory.UTILITY,
    });

    expect(receivedArgs).toEqual({
      where: {
        costCenterId: 'cost-center-1',
        category: ExpenseCategory.UTILITY,
        paidAt: null,
        expectedAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.000Z'),
        },
      },
      orderBy: { expectedAt: 'asc' },
      select: {
        id: true,
        name: true,
        category: true,
        amount: true,
        costCenterId: true,
        expectedAt: true,
        paidAt: true,
        CostCenter: { select: { id: true, code: true, name: true } },
      },
    });
  });
});
