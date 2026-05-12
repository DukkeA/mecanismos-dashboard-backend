import { DashboardRepository } from './dashboard.repository';

describe('DashboardRepository', () => {
  it('reads open work orders for actions by estimated completion date and open statuses', async () => {
    let receivedArgs: Record<string, unknown> | undefined;
    const prisma = {
      workOrder: {
        findMany: jest.fn((args: Record<string, unknown>) => {
          receivedArgs = args;
          return Promise.resolve([]);
        }),
      },
    };

    const repository = new DashboardRepository(prisma as never);

    await repository.findOpenWorkOrdersForActions({
      from: new Date('2026-05-01T00:00:00.000Z'),
      to: new Date('2026-05-31T23:59:59.999Z'),
    });

    expect(receivedArgs).toMatchObject({
      where: {
        status: { in: ['IN_PROGRESS', 'PAUSED'] },
        estimatedCompletionAt: {
          not: null,
          lte: new Date('2026-05-31T23:59:59.999Z'),
        },
      },
      orderBy: [{ estimatedCompletionAt: 'asc' }, { number: 'asc' }],
    });
    expect(receivedArgs).toHaveProperty('select.estimatedCompletionAt', true);
    expect(receivedArgs).toHaveProperty('select.externalLink', true);
  });

  it('reads receivable work orders for actions by estimated collection and payment status', async () => {
    let receivedArgs: Record<string, unknown> | undefined;
    const prisma = {
      workOrder: {
        findMany: jest.fn((args: Record<string, unknown>) => {
          receivedArgs = args;
          return Promise.resolve([]);
        }),
      },
    };

    const repository = new DashboardRepository(prisma as never);

    await repository.findReceivableWorkOrdersForActions({
      to: new Date('2026-05-31T23:59:59.999Z'),
    });

    expect(receivedArgs).toMatchObject({
      where: {
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
        estimatedCollectionAt: {
          not: null,
          lte: new Date('2026-05-31T23:59:59.999Z'),
        },
      },
      orderBy: [{ estimatedCollectionAt: 'asc' }, { number: 'asc' }],
    });
    expect(receivedArgs).toHaveProperty(
      'select.WorkOrderEstimate.select.totalPriceAmount',
      true,
    );
    expect(receivedArgs).toHaveProperty(
      'select.WorkOrderPayment.select.amount',
      true,
    );
  });

  it('reads pending expenses and action inventory by their action date bases', async () => {
    let expenseArgs: Record<string, unknown> | undefined;
    let inventoryArgs: Record<string, unknown> | undefined;
    const prisma = {
      expense: {
        findMany: jest.fn((args: Record<string, unknown>) => {
          expenseArgs = args;
          return Promise.resolve([]);
        }),
      },
      inventoryItem: {
        findMany: jest.fn((args: Record<string, unknown>) => {
          inventoryArgs = args;
          return Promise.resolve([]);
        }),
      },
    };

    const repository = new DashboardRepository(prisma as never);
    const range = { to: new Date('2026-05-31T23:59:59.999Z') };

    await repository.findPendingExpensesForActions(range);
    await repository.findInventoryItemsForActions(range);

    expect(expenseArgs).toEqual({
      where: {
        paidAt: null,
        expectedAt: {
          lte: new Date('2026-05-31T23:59:59.999Z'),
        },
      },
      orderBy: { expectedAt: 'asc' },
      select: {
        id: true,
        name: true,
        amount: true,
        expectedAt: true,
        paidAt: true,
        CostCenter: { select: { id: true, code: true, name: true } },
      },
    });
    expect(inventoryArgs).toMatchObject({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        minimumStock: true,
        defaultSalePrice: true,
        InventoryMovement: {
          select: { movementType: true, quantity: true },
          where: { occurredAt: { lte: new Date('2026-05-31T23:59:59.999Z') } },
          orderBy: { occurredAt: 'asc' },
        },
      },
    });
    expect(inventoryArgs).toHaveProperty(
      'select.SupplierQuoteHistory.select.status',
      true,
    );
    expect(inventoryArgs).toHaveProperty(
      'select.SupplierQuoteHistory.where.quotedAt.lte',
      new Date('2026-05-31T23:59:59.999Z'),
    );
  });

  it('reads work orders with financial relations inside the flexible createdAt range', async () => {
    let receivedArgs: Record<string, unknown> | undefined;

    const prisma = {
      workOrder: {
        findMany: jest.fn((args: Record<string, unknown>) => {
          receivedArgs = args;
          return Promise.resolve([]);
        }),
      },
    };

    const repository = new DashboardRepository(prisma as never);

    await repository.findWorkOrders({
      from: new Date('2026-05-01T00:00:00.000Z'),
      to: new Date('2026-05-31T23:59:59.999Z'),
    });

    expect(receivedArgs).toEqual({
      where: {
        createdAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.999Z'),
        },
      },
      orderBy: { number: 'desc' },
      select: {
        id: true,
        number: true,
        summary: true,
        status: true,
        paymentStatus: true,
        externalLink: true,
        createdAt: true,
        completedAt: true,
        estimatedCompletionAt: true,
        estimatedCollectionAt: true,
        Customer: { select: { name: true } },
        WorkOrderEstimate: {
          select: { phase: true, totalPriceAmount: true },
          orderBy: { createdAt: 'asc' },
        },
        WorkOrderPayment: {
          select: { id: true, amount: true, paidAt: true },
          orderBy: { paidAt: 'asc' },
        },
        WorkOrderActualCost: {
          select: { id: true, amount: true, category: true, incurredAt: true },
          orderBy: { incurredAt: 'asc' },
        },
      },
    });
  });

  it('aggregates payment/cost totals and expense windows with the correct date basis', async () => {
    let paymentAggregateArgs: Record<string, unknown> | undefined;
    let costAggregateArgs: Record<string, unknown> | undefined;
    let paidExpenseArgs: Record<string, unknown> | undefined;
    let pendingExpenseArgs: Record<string, unknown> | undefined;

    const prisma = {
      workOrderPayment: {
        aggregate: jest.fn((args: Record<string, unknown>) => {
          paymentAggregateArgs = args;
          return Promise.resolve({ _sum: { amount: 0 } });
        }),
      },
      workOrderActualCost: {
        aggregate: jest.fn((args: Record<string, unknown>) => {
          costAggregateArgs = args;
          return Promise.resolve({ _sum: { amount: 0 } });
        }),
      },
      expense: {
        findMany: jest.fn((args: Record<string, unknown>) => {
          if ((args.orderBy as { paidAt?: string })?.paidAt) {
            paidExpenseArgs = args;
          } else {
            pendingExpenseArgs = args;
          }

          return Promise.resolve([]);
        }),
      },
    };

    const repository = new DashboardRepository(prisma as never);
    const range = {
      from: new Date('2026-05-01T00:00:00.000Z'),
      to: new Date('2026-05-31T23:59:59.999Z'),
    };

    await repository.aggregatePaymentsCollected(range);
    await repository.aggregateActualCosts(range);
    await repository.findPaidExpenses(range);
    await repository.findPendingExpenses(range);

    expect(paymentAggregateArgs).toEqual({
      where: {
        paidAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.999Z'),
        },
      },
      _sum: { amount: true },
    });
    expect(costAggregateArgs).toEqual({
      where: {
        incurredAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.999Z'),
        },
      },
      _sum: { amount: true },
    });
    expect(paidExpenseArgs).toEqual({
      where: {
        paidAt: {
          not: null,
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.999Z'),
        },
      },
      orderBy: { paidAt: 'asc' },
      select: {
        id: true,
        name: true,
        amount: true,
        expectedAt: true,
        paidAt: true,
        CostCenter: { select: { id: true, code: true, name: true } },
      },
    });
    expect(pendingExpenseArgs).toEqual({
      where: {
        paidAt: null,
        expectedAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.999Z'),
        },
      },
      orderBy: { expectedAt: 'asc' },
      select: {
        id: true,
        name: true,
        amount: true,
        expectedAt: true,
        paidAt: true,
        CostCenter: { select: { id: true, code: true, name: true } },
      },
    });
  });

  it('reads inventory, payroll, and recent activity with bounded previews', async () => {
    let inventoryArgs: Record<string, unknown> | undefined;
    let payrollArgs: Record<string, unknown> | undefined;
    let paymentArgs: Record<string, unknown> | undefined;
    let completedArgs: Record<string, unknown> | undefined;
    let inventoryMovementArgs: Record<string, unknown> | undefined;

    const prisma = {
      inventoryItem: {
        findMany: jest.fn((args: Record<string, unknown>) => {
          inventoryArgs = args;
          return Promise.resolve([]);
        }),
      },
      employeeMonthlyPayroll: {
        findFirst: jest.fn((args: Record<string, unknown>) => {
          payrollArgs = args;
          return Promise.resolve(null);
        }),
      },
      workOrderPayment: {
        findMany: jest.fn((args: Record<string, unknown>) => {
          paymentArgs = args;
          return Promise.resolve([]);
        }),
      },
      expense: {
        findMany: jest.fn(() => Promise.resolve([])),
      },
      workOrder: {
        findMany: jest.fn((args: Record<string, unknown>) => {
          completedArgs = args;
          return Promise.resolve([]);
        }),
      },
      inventoryMovement: {
        findMany: jest.fn((args: Record<string, unknown>) => {
          inventoryMovementArgs = args;
          return Promise.resolve([]);
        }),
      },
    };

    const repository = new DashboardRepository(prisma as never);
    const range = {
      from: new Date('2026-05-01T00:00:00.000Z'),
      to: new Date('2026-05-31T23:59:59.999Z'),
    };

    await repository.findInventoryItemsWithMovements(range);
    await repository.findLatestPayrollSnapshot(range);
    await repository.findRecentPayments(range, 5);
    await repository.findRecentCompletedWorkOrders(range, 5);
    await repository.findRecentInventoryMovements(range, 5);

    expect(inventoryArgs).toEqual({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        minimumStock: true,
        InventoryMovement: {
          select: { movementType: true, quantity: true },
          where: { occurredAt: { lte: new Date('2026-05-31T23:59:59.999Z') } },
          orderBy: { occurredAt: 'asc' },
        },
      },
    });
    expect(payrollArgs).toEqual({
      where: {
        OR: [
          { year: 2026, month: 5 },
          { year: 2026, month: 5 },
        ],
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: {
        id: true,
        year: true,
        month: true,
        status: true,
        grandTotal: true,
      },
    });
    expect(paymentArgs).toEqual({
      where: {
        paidAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.999Z'),
        },
      },
      orderBy: { paidAt: 'desc' },
      take: 5,
      select: {
        id: true,
        amount: true,
        paidAt: true,
        WorkOrder: {
          select: {
            id: true,
            number: true,
            Customer: { select: { name: true } },
          },
        },
      },
    });
    expect(completedArgs).toEqual({
      where: {
        completedAt: {
          not: null,
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.999Z'),
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        number: true,
        summary: true,
        completedAt: true,
        Customer: { select: { name: true } },
      },
    });
    expect(inventoryMovementArgs).toEqual({
      where: {
        occurredAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.999Z'),
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: 5,
      select: {
        id: true,
        occurredAt: true,
        movementType: true,
        quantity: true,
        InventoryItem: { select: { name: true } },
      },
    });
  });
});
