import { Inject, Injectable } from '@nestjs/common';
import type {
  CostCenter,
  Employee,
  Expense,
  Prisma,
  WorkOrder,
  WorkOrderActualCost,
  WorkOrderEstimate,
  WorkOrderPayment,
} from '../../../generated/prisma/client';
import {
  EmployeeType,
  ExpenseCategory,
  PaymentStatus,
  WorkOrderStatus,
} from '../../../generated/prisma/enums';
import { OPERATIONS_REPORTING_PRISMA_CLIENT } from '../operations-reporting.tokens';
import {
  buildInclusiveDateWindow,
  buildPaidExpenseWindow,
  buildPendingExpenseWindow,
} from './operations-reporting-date-windows';

type WorkOrderWhereInput = Prisma.WorkOrderWhereInput;
type EmployeeWhereInput = Prisma.EmployeeWhereInput;
type ExpenseWhereInput = Prisma.ExpenseWhereInput;

export type OperationsSummaryQuery = {
  dateFrom?: Date;
  dateTo?: Date;
  status?: WorkOrderStatus;
  paymentStatus?: PaymentStatus;
};

export type WorkOrderFinancialsQuery = {
  dateFrom?: Date;
  dateTo?: Date;
  customerId?: string;
  assignedEmployeeId?: string;
  status?: WorkOrderStatus;
  paymentStatus?: PaymentStatus;
};

export type MechanicsAssignmentsQuery = {
  dateFrom?: Date;
  dateTo?: Date;
  assignedEmployeeId?: string;
  includeInactiveMechanics?: boolean;
};

export type ReportExpensesQuery = {
  dateFrom?: Date;
  dateTo?: Date;
  costCenterId?: string;
  expenseCategory?: ExpenseCategory;
};

export type SummaryWorkOrderReadModel = Pick<
  WorkOrder,
  'id' | 'status' | 'paymentStatus'
>;

export type FinancialEstimateReadModel = Pick<
  WorkOrderEstimate,
  'phase' | 'totalPriceAmount'
>;

export type FinancialPaymentReadModel = Pick<
  WorkOrderPayment,
  'id' | 'amount' | 'paidAt'
>;

export type FinancialActualCostReadModel = Pick<
  WorkOrderActualCost,
  'id' | 'amount' | 'category' | 'incurredAt'
>;

export type WorkOrderFinancialReadModel = Pick<
  WorkOrder,
  | 'id'
  | 'number'
  | 'createdAt'
  | 'status'
  | 'paymentStatus'
  | 'customerId'
  | 'assignedEmployeeId'
> & {
  Customer: Pick<{ id: string; name: string }, 'id' | 'name'> | null;
  Vehicle: Pick<
    { id: string; brand: string; modelReference: string; plate: string },
    'id' | 'brand' | 'modelReference' | 'plate'
  > | null;
  Component: Pick<
    { id: string; brand: string; reference: string; identifier: string | null },
    'id' | 'brand' | 'reference' | 'identifier'
  > | null;
  Employee: Pick<Employee, 'id' | 'name' | 'type' | 'isActive'> | null;
  WorkOrderEstimate: FinancialEstimateReadModel[];
  WorkOrderPayment: FinancialPaymentReadModel[];
  WorkOrderActualCost: FinancialActualCostReadModel[];
};

export type MechanicAssignmentsReadModel = Pick<
  Employee,
  'id' | 'name' | 'type' | 'isActive'
> & {
  WorkOrder: Array<
    Pick<WorkOrder, 'id' | 'number' | 'status' | 'paymentStatus'> & {
      WorkOrderEstimate: FinancialEstimateReadModel[];
      WorkOrderPayment: FinancialPaymentReadModel[];
      WorkOrderActualCost: FinancialActualCostReadModel[];
    }
  >;
};

export type ExpenseReadModel = Pick<
  Expense,
  'id' | 'name' | 'category' | 'amount' | 'costCenterId' | 'expectedAt' | 'paidAt'
> & {
  CostCenter: Pick<CostCenter, 'id' | 'code' | 'name'> | null;
};

type OperationsReportingPrismaClient = {
  workOrder: {
    findMany(args: {
      where: WorkOrderWhereInput;
      orderBy?: { number: 'desc' };
      select: Record<string, unknown>;
    }): Promise<SummaryWorkOrderReadModel[] | WorkOrderFinancialReadModel[]>;
  };
  employee: {
    findMany(args: {
      where: EmployeeWhereInput;
      orderBy: { name: 'asc' };
      select: Record<string, unknown>;
    }): Promise<MechanicAssignmentsReadModel[]>;
  };
  expense: {
    findMany(args: {
      where: ExpenseWhereInput;
      orderBy: { paidAt: 'asc' } | { expectedAt: 'asc' };
      select: Record<string, unknown>;
    }): Promise<ExpenseReadModel[]>;
  };
};

const summarySelect = {
  id: true,
  status: true,
  paymentStatus: true,
} as const;

const financialOrderBy = { number: 'desc' } as const;

const financialSelect = {
  id: true,
  number: true,
  createdAt: true,
  status: true,
  paymentStatus: true,
  customerId: true,
  assignedEmployeeId: true,
  Customer: { select: { id: true, name: true } },
  Vehicle: { select: { id: true, brand: true, modelReference: true, plate: true } },
  Component: {
    select: { id: true, brand: true, reference: true, identifier: true },
  },
  Employee: { select: { id: true, name: true, type: true, isActive: true } },
} as const;

const estimateSelect = {
  select: { phase: true, totalPriceAmount: true },
  orderBy: { createdAt: 'asc' },
} as const;

const paymentSelect = (query: { dateFrom?: Date; dateTo?: Date }) => ({
  where: buildInclusiveDateWindow('paidAt', query),
  select: { id: true, amount: true, paidAt: true },
  orderBy: { paidAt: 'asc' },
});

const actualCostSelect = (query: { dateFrom?: Date; dateTo?: Date }) => ({
  where: buildInclusiveDateWindow('incurredAt', query),
  select: { id: true, amount: true, category: true, incurredAt: true },
  orderBy: { incurredAt: 'asc' },
});

const expenseSelect = {
  id: true,
  name: true,
  category: true,
  amount: true,
  costCenterId: true,
  expectedAt: true,
  paidAt: true,
  CostCenter: { select: { id: true, code: true, name: true } },
} as const;

@Injectable()
export class OperationsReportingRepository {
  constructor(
    @Inject(OPERATIONS_REPORTING_PRISMA_CLIENT)
    private readonly prisma: OperationsReportingPrismaClient,
  ) {}

  async findSummaryWorkOrders(
    query: OperationsSummaryQuery,
  ): Promise<SummaryWorkOrderReadModel[]> {
    return this.prisma.workOrder.findMany({
      where: buildSummaryWorkOrderWhere(query),
      select: summarySelect,
    }) as Promise<SummaryWorkOrderReadModel[]>;
  }

  async findWorkOrdersWithFinancials(
    query: WorkOrderFinancialsQuery,
  ): Promise<WorkOrderFinancialReadModel[]> {
    return this.prisma.workOrder.findMany({
      where: buildFinancialWorkOrderWhere(query),
      orderBy: financialOrderBy,
      select: {
        ...financialSelect,
        WorkOrderEstimate: estimateSelect,
        WorkOrderPayment: paymentSelect(query),
        WorkOrderActualCost: actualCostSelect(query),
      },
    }) as Promise<WorkOrderFinancialReadModel[]>;
  }

  async findMechanicsWithAssignments(
    query: MechanicsAssignmentsQuery,
  ): Promise<MechanicAssignmentsReadModel[]> {
    return this.prisma.employee.findMany({
      where: buildMechanicWhere(query),
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
        WorkOrder: {
          where: buildInclusiveDateWindow('createdAt', query),
          orderBy: financialOrderBy,
          select: {
            id: true,
            number: true,
            status: true,
            paymentStatus: true,
            WorkOrderEstimate: estimateSelect,
            WorkOrderPayment: paymentSelect(query),
            WorkOrderActualCost: actualCostSelect(query),
          },
        },
      },
    });
  }

  findPaidExpenses(query: ReportExpensesQuery): Promise<ExpenseReadModel[]> {
    return this.prisma.expense.findMany({
      where: buildPaidExpensesWhere(query),
      orderBy: { paidAt: 'asc' },
      select: expenseSelect,
    });
  }

  findPendingExpenses(query: ReportExpensesQuery): Promise<ExpenseReadModel[]> {
    return this.prisma.expense.findMany({
      where: buildPendingExpensesWhere(query),
      orderBy: { expectedAt: 'asc' },
      select: expenseSelect,
    });
  }
}

function buildSummaryWorkOrderWhere(
  query: OperationsSummaryQuery,
): WorkOrderWhereInput {
  return {
    ...buildInclusiveDateWindow('createdAt', query),
    ...(query.status ? { status: query.status } : {}),
    ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
  };
}

function buildFinancialWorkOrderWhere(
  query: WorkOrderFinancialsQuery,
): WorkOrderWhereInput {
  return {
    ...buildInclusiveDateWindow('createdAt', query),
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.assignedEmployeeId
      ? { assignedEmployeeId: query.assignedEmployeeId }
      : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
  };
}

function buildMechanicWhere(query: MechanicsAssignmentsQuery): EmployeeWhereInput {
  return {
    ...(query.assignedEmployeeId ? { id: query.assignedEmployeeId } : {}),
    type: EmployeeType.MECHANIC,
    ...(query.includeInactiveMechanics ? {} : { isActive: true }),
  };
}

function buildPaidExpensesWhere(query: ReportExpensesQuery): ExpenseWhereInput {
  return {
    ...(query.costCenterId ? { costCenterId: query.costCenterId } : {}),
    ...(query.expenseCategory ? { category: query.expenseCategory } : {}),
    ...buildPaidExpenseWindow(query),
  };
}

function buildPendingExpensesWhere(query: ReportExpensesQuery): ExpenseWhereInput {
  return {
    ...(query.costCenterId ? { costCenterId: query.costCenterId } : {}),
    ...(query.expenseCategory ? { category: query.expenseCategory } : {}),
    ...buildPendingExpenseWindow(query),
  };
}
