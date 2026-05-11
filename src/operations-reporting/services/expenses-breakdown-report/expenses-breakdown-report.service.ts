import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '../../../../generated/prisma/enums';

import { ExpensesBreakdownReportQueryDto } from '../../dto/expenses-breakdown-report-query.dto';
import { ExpensesBreakdownReportResponseDto } from '../../dto/expenses-breakdown-report-response.dto';
import {
  ExpenseReadModel,
  OperationsReportingRepository,
  ReportExpensesQuery,
} from '../../persistence/operations-reporting.repository';

@Injectable()
export class ExpensesBreakdownReportService {
  constructor(
    private readonly operationsReportingRepository: OperationsReportingRepository,
  ) {}

  async getReport(
    query: ExpensesBreakdownReportQueryDto,
  ): Promise<ExpensesBreakdownReportResponseDto> {
    const repositoryQuery = toRepositoryQuery(query);
    const expenses = await Promise.all([
      shouldIncludePaid(query.paymentStatus)
        ? this.operationsReportingRepository.findPaidExpenses(repositoryQuery)
        : Promise.resolve([]),
      shouldIncludePending(query.paymentStatus)
        ? this.operationsReportingRepository.findPendingExpenses(
            repositoryQuery,
          )
        : Promise.resolve([]),
    ]);

    return {
      approximate: true,
      basis: 'cash-operational',
      window: {
        dateFrom: query.dateFrom?.toISOString() ?? null,
        dateTo: query.dateTo?.toISOString() ?? null,
      },
      data: groupExpensesByBreakdown(expenses[0], expenses[1]),
    };
  }
}

type ExpenseRow = ExpensesBreakdownReportResponseDto['data'][number];
type ExpenseBreakdownPaymentStatus = 'PAID' | 'PENDING';

function toRepositoryQuery(
  query: ExpensesBreakdownReportQueryDto,
): ReportExpensesQuery {
  return {
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    costCenterId: query.costCenterId,
    expenseCategory: query.expenseCategory,
  };
}

function shouldIncludePaid(paymentStatus?: PaymentStatus): boolean {
  return paymentStatus !== PaymentStatus.PENDING;
}

function shouldIncludePending(paymentStatus?: PaymentStatus): boolean {
  return paymentStatus !== PaymentStatus.PAID;
}

function groupExpensesByBreakdown(
  paidExpenses: ExpenseReadModel[],
  pendingExpenses: ExpenseReadModel[],
): ExpenseRow[] {
  const groupedRows = new Map<string, ExpenseRow>();

  for (const expense of paidExpenses) {
    addExpenseToGroup(groupedRows, expense, PaymentStatus.PAID);
  }

  for (const expense of pendingExpenses) {
    addExpenseToGroup(groupedRows, expense, PaymentStatus.PENDING);
  }

  return [...groupedRows.values()].sort(compareExpenseRows);
}

function addExpenseToGroup(
  groupedRows: Map<string, ExpenseRow>,
  expense: ExpenseReadModel,
  paymentStatus: ExpenseBreakdownPaymentStatus,
) {
  const sourceDate =
    paymentStatus === PaymentStatus.PAID ? expense.paidAt : expense.expectedAt;

  if (!sourceDate) {
    return;
  }

  const period = sourceDate.toISOString().slice(0, 10);
  const costCenterId = expense.costCenterId;
  const costCenterName = expense.CostCenter?.name ?? null;
  const key = [
    period,
    expense.category,
    paymentStatus,
    costCenterId ?? 'no-cost-center',
  ].join('|');
  const existingRow = groupedRows.get(key);

  if (existingRow) {
    existingRow.totalAmount += expense.amount;

    return;
  }

  groupedRows.set(key, {
    period,
    expenseCategory: expense.category,
    paymentStatus,
    costCenterId,
    costCenterName,
    totalAmount: expense.amount,
  });
}

function compareExpenseRows(left: ExpenseRow, right: ExpenseRow): number {
  return (
    left.period.localeCompare(right.period) ||
    left.paymentStatus.localeCompare(right.paymentStatus) ||
    left.expenseCategory.localeCompare(right.expenseCategory) ||
    (left.costCenterName ?? '').localeCompare(right.costCenterName ?? '')
  );
}
