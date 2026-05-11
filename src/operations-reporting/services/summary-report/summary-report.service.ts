import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentStatus,
  WorkOrderStatus,
} from '../../../../generated/prisma/enums';
import {
  calculateBalance,
  isOverpaid,
  resolvePayableAmount,
} from '../../calculations/operations-reporting.calculations';
import { SummaryReportQueryDto } from '../../dto/summary-report-query.dto';
import { SummaryReportResponseDto } from '../../dto/summary-report-response.dto';
import { buildSafeReportLoggerContext } from '../../observability/operations-reporting-logger';
import {
  ExpenseReadModel,
  OperationsReportingRepository,
  SummaryWorkOrderReadModel,
  WorkOrderFinancialReadModel,
} from '../../persistence/operations-reporting.repository';

@Injectable()
export class SummaryReportService {
  private readonly logger = new Logger(SummaryReportService.name);

  constructor(private readonly repository: OperationsReportingRepository) {}

  async getReport(
    query: SummaryReportQueryDto,
  ): Promise<SummaryReportResponseDto> {
    const context = buildSafeReportLoggerContext('summary', query, query);

    try {
      const [workOrders, financials, paidExpenses, pendingExpenses] =
        await Promise.all([
          this.repository.findSummaryWorkOrders(query),
          this.repository.findWorkOrdersWithFinancials(query),
          this.repository.findPaidExpenses(query),
          this.repository.findPendingExpenses(query),
        ]);

      const paymentsCollected = sumFinancialAmounts(
        financials,
        'WorkOrderPayment',
      );
      const actualCosts = sumFinancialAmounts(
        financials,
        'WorkOrderActualCost',
      );
      const paidExpensesTotal = sumExpenses(paidExpenses);

      this.logger.log(
        `report=summary completed ${JSON.stringify(context)} resultCount=${workOrders.length}`,
      );

      return {
        approximate: true,
        basis: 'cash-operational',
        window: {
          dateFrom: query.dateFrom?.toISOString() ?? null,
          dateTo: query.dateTo?.toISOString() ?? null,
        },
        totals: {
          workOrders: countWorkOrderStatuses(workOrders),
          paymentStatus: countPaymentStatuses(workOrders),
          paymentsCollected,
          pendingReceivables: calculatePendingReceivables(financials),
          actualCosts,
          paidExpenses: paidExpensesTotal,
          pendingExpenses: sumExpenses(pendingExpenses),
          approximateUtility:
            paymentsCollected - actualCosts - paidExpensesTotal,
        },
      };
    } catch (error) {
      this.logger.error(
        `report=summary failed ${JSON.stringify(context)}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }
}

function countWorkOrderStatuses(workOrders: SummaryWorkOrderReadModel[]) {
  return {
    inProgress: workOrders.filter(
      (workOrder) => workOrder.status === WorkOrderStatus.IN_PROGRESS,
    ).length,
    paused: workOrders.filter(
      (workOrder) => workOrder.status === WorkOrderStatus.PAUSED,
    ).length,
    completed: workOrders.filter(
      (workOrder) => workOrder.status === WorkOrderStatus.COMPLETED,
    ).length,
    cancelled: workOrders.filter(
      (workOrder) => workOrder.status === WorkOrderStatus.CANCELLED,
    ).length,
  };
}

function countPaymentStatuses(workOrders: SummaryWorkOrderReadModel[]) {
  return {
    pending: workOrders.filter(
      (workOrder) => workOrder.paymentStatus === PaymentStatus.PENDING,
    ).length,
    partial: workOrders.filter(
      (workOrder) => workOrder.paymentStatus === PaymentStatus.PARTIAL,
    ).length,
    paid: workOrders.filter(
      (workOrder) => workOrder.paymentStatus === PaymentStatus.PAID,
    ).length,
  };
}

function sumFinancialAmounts(
  financials: WorkOrderFinancialReadModel[],
  field: 'WorkOrderPayment' | 'WorkOrderActualCost',
) {
  return financials.reduce(
    (total, workOrder) =>
      total +
      workOrder[field].reduce(
        (nestedTotal, entry) => nestedTotal + entry.amount,
        0,
      ),
    0,
  );
}

function sumExpenses(expenses: ExpenseReadModel[]) {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
}

function calculatePendingReceivables(
  financials: WorkOrderFinancialReadModel[],
) {
  const pendingRows = financials.filter(
    (workOrder) =>
      workOrder.paymentStatus === PaymentStatus.PENDING ||
      workOrder.paymentStatus === PaymentStatus.PARTIAL,
  );

  let total = 0;

  for (const workOrder of pendingRows) {
    const payableAmount = resolvePayableAmount(workOrder.WorkOrderEstimate);
    const paidTotal = workOrder.WorkOrderPayment.reduce(
      (subtotal, payment) => subtotal + payment.amount,
      0,
    );

    if (payableAmount === null) {
      return null;
    }

    if (isOverpaid({ payableAmount, paidTotal })) {
      continue;
    }

    total += calculateBalance({ payableAmount, paidTotal }) ?? 0;
  }

  return total;
}
