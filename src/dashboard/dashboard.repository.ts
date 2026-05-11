import { Inject, Injectable } from '@nestjs/common';
import type { InventoryMovementType } from '../../generated/prisma/enums';
import type { Prisma } from '../../generated/prisma/client';

export const DASHBOARD_PRISMA_CLIENT = Symbol('DASHBOARD_PRISMA_CLIENT');

export type DashboardDateRange = {
  from?: Date;
  to?: Date;
};

const workOrderSelect = {
  id: true,
  number: true,
  status: true,
  paymentStatus: true,
  createdAt: true,
  completedAt: true,
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
} satisfies Prisma.WorkOrderSelect;

const expenseSelect = {
  id: true,
  name: true,
  amount: true,
  expectedAt: true,
  paidAt: true,
  CostCenter: { select: { id: true, code: true, name: true } },
} satisfies Prisma.ExpenseSelect;

const inventorySelect = {
  id: true,
  name: true,
  minimumStock: true,
  InventoryMovement: {
    select: { movementType: true, quantity: true },
    orderBy: { occurredAt: 'asc' },
  },
} satisfies Prisma.InventoryItemSelect;

const recentExpenseSelect = {
  id: true,
  name: true,
  amount: true,
  paidAt: true,
} satisfies Prisma.ExpenseSelect;

const recentCompletedWorkOrderSelect = {
  id: true,
  number: true,
  summary: true,
  completedAt: true,
  Customer: { select: { name: true } },
} satisfies Prisma.WorkOrderSelect;

type DashboardPrismaClient = {
  workOrder: {
    findMany<T extends Prisma.WorkOrderFindManyArgs>(
      args: T,
    ): Promise<Prisma.WorkOrderGetPayload<T>[]>;
  };
  workOrderPayment: {
    aggregate(args: Prisma.WorkOrderPaymentAggregateArgs): Promise<{
      _sum: { amount: number | null };
    }>;
    findMany<T extends Prisma.WorkOrderPaymentFindManyArgs>(
      args: T,
    ): Promise<Prisma.WorkOrderPaymentGetPayload<T>[]>;
  };
  workOrderActualCost: {
    aggregate(args: Prisma.WorkOrderActualCostAggregateArgs): Promise<{
      _sum: { amount: number | null };
    }>;
  };
  expense: {
    findMany<T extends Prisma.ExpenseFindManyArgs>(
      args: T,
    ): Promise<Prisma.ExpenseGetPayload<T>[]>;
  };
  inventoryItem: {
    findMany<T extends Prisma.InventoryItemFindManyArgs>(
      args: T,
    ): Promise<Prisma.InventoryItemGetPayload<T>[]>;
  };
  employeeMonthlyPayroll: {
    findFirst<T extends Prisma.EmployeeMonthlyPayrollFindFirstArgs>(
      args: T,
    ): Promise<Prisma.EmployeeMonthlyPayrollGetPayload<T> | null>;
  };
  inventoryMovement: {
    findMany<T extends Prisma.InventoryMovementFindManyArgs>(
      args: T,
    ): Promise<Prisma.InventoryMovementGetPayload<T>[]>;
  };
};

export type DashboardWorkOrderRecord = Prisma.WorkOrderGetPayload<{
  select: typeof workOrderSelect;
}>;

export type DashboardExpenseRecord = Prisma.ExpenseGetPayload<{
  select: typeof expenseSelect;
}>;

export type DashboardInventoryItemRecord = Prisma.InventoryItemGetPayload<{
  select: typeof inventorySelect;
}>;

export type DashboardPayrollRecord = Pick<
  Prisma.EmployeeMonthlyPayrollGetPayload<object>,
  'id' | 'year' | 'month' | 'status' | 'grandTotal'
>;

export type RecentPaymentRecord = {
  id: string;
  amount: number;
  paidAt: Date;
  WorkOrder: { id: string; number: number; Customer: { name: string } | null };
};

export type RecentExpenseRecord = Pick<
  DashboardExpenseRecord,
  'id' | 'name' | 'amount' | 'paidAt'
>;

export type RecentCompletedWorkOrderRecord = {
  id: string;
  number: number;
  summary: string;
  completedAt: Date | null;
  Customer: { name: string } | null;
};

export type RecentInventoryMovementRecord = {
  id: string;
  occurredAt: Date;
  movementType: InventoryMovementType;
  quantity: number;
  InventoryItem: { name: string };
};

@Injectable()
export class DashboardRepository {
  constructor(
    @Inject(DASHBOARD_PRISMA_CLIENT)
    private readonly prisma: DashboardPrismaClient,
  ) {}

  findWorkOrders(range: DashboardDateRange) {
    return this.prisma.workOrder.findMany({
      where: buildInclusiveWindow('createdAt', range),
      orderBy: { number: 'desc' },
      select: workOrderSelect,
    });
  }

  async aggregatePaymentsCollected(range: DashboardDateRange) {
    const result = await this.prisma.workOrderPayment.aggregate({
      where: buildInclusiveWindow('paidAt', range),
      _sum: { amount: true },
    });

    return result._sum.amount ?? 0;
  }

  async aggregateActualCosts(range: DashboardDateRange) {
    const result = await this.prisma.workOrderActualCost.aggregate({
      where: buildInclusiveWindow('incurredAt', range),
      _sum: { amount: true },
    });

    return result._sum.amount ?? 0;
  }

  findPaidExpenses(range: DashboardDateRange) {
    return this.prisma.expense.findMany({
      where: {
        paidAt: {
          not: null,
          ...(range.from ? { gte: range.from } : {}),
          ...(range.to ? { lte: range.to } : {}),
        },
      },
      orderBy: { paidAt: 'asc' },
      select: expenseSelect,
    });
  }

  findPendingExpenses(range: DashboardDateRange) {
    return this.prisma.expense.findMany({
      where: {
        paidAt: null,
        ...buildInclusiveWindow('expectedAt', range),
      },
      orderBy: { expectedAt: 'asc' },
      select: expenseSelect,
    });
  }

  findInventoryItemsWithMovements(range: DashboardDateRange) {
    return this.prisma.inventoryItem.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        ...inventorySelect,
        InventoryMovement: {
          select: { movementType: true, quantity: true },
          where: range.to ? { occurredAt: { lte: range.to } } : undefined,
          orderBy: { occurredAt: 'asc' },
        },
      },
    });
  }

  findLatestPayrollSnapshot(range: DashboardDateRange) {
    return this.prisma.employeeMonthlyPayroll.findFirst({
      where: buildPayrollWhere(range),
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: {
        id: true,
        year: true,
        month: true,
        status: true,
        grandTotal: true,
      },
    });
  }

  findRecentPayments(range: DashboardDateRange, take = 5) {
    return this.prisma.workOrderPayment.findMany({
      where: buildInclusiveWindow('paidAt', range),
      orderBy: { paidAt: 'desc' },
      take,
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
  }

  findRecentExpenses(range: DashboardDateRange, take = 5) {
    return this.prisma.expense.findMany({
      where: {
        paidAt: {
          not: null,
          ...(range.from ? { gte: range.from } : {}),
          ...(range.to ? { lte: range.to } : {}),
        },
      },
      orderBy: { paidAt: 'desc' },
      take,
      select: recentExpenseSelect,
    });
  }

  findRecentCompletedWorkOrders(range: DashboardDateRange, take = 5) {
    return this.prisma.workOrder.findMany({
      where: {
        completedAt: {
          not: null,
          ...(range.from ? { gte: range.from } : {}),
          ...(range.to ? { lte: range.to } : {}),
        },
      },
      orderBy: { completedAt: 'desc' },
      take,
      select: recentCompletedWorkOrderSelect,
    });
  }

  findRecentInventoryMovements(range: DashboardDateRange, take = 5) {
    return this.prisma.inventoryMovement.findMany({
      where: buildInclusiveWindow('occurredAt', range),
      orderBy: { occurredAt: 'desc' },
      take,
      select: {
        id: true,
        occurredAt: true,
        movementType: true,
        quantity: true,
        InventoryItem: { select: { name: true } },
      },
    });
  }
}

function buildInclusiveWindow(
  field: 'createdAt' | 'paidAt' | 'incurredAt' | 'expectedAt' | 'occurredAt',
  range: DashboardDateRange,
) {
  if (!range.from && !range.to) {
    return {};
  }

  return {
    [field]: {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {}),
    },
  };
}

function buildPayrollWhere(
  range: DashboardDateRange,
): Prisma.EmployeeMonthlyPayrollWhereInput {
  if (!range.from && !range.to) {
    return {};
  }

  const bounds = [range.from, range.to].filter(
    (value): value is Date => value instanceof Date,
  );

  const months = bounds.map((value) => ({
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
  }));

  return {
    OR: months.map((value) => ({ year: value.year, month: value.month })),
  };
}
