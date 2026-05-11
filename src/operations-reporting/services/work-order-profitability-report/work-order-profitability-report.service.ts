import { Injectable, Logger } from '@nestjs/common';

import {
  calculateGrossMargin,
  calculateGrossUtility,
  resolvePayableAmount,
} from '../../calculations/operations-reporting.calculations';
import { WorkOrderProfitabilityReportQueryDto } from '../../dto/work-order-profitability-report-query.dto';
import { WorkOrderProfitabilityReportResponseDto } from '../../dto/work-order-profitability-report-response.dto';
import { buildSafeReportLoggerContext } from '../../observability/operations-reporting-logger';
import {
  OperationsReportingRepository,
  type WorkOrderFinancialReadModel,
} from '../../persistence/operations-reporting.repository';

@Injectable()
export class WorkOrderProfitabilityReportService {
  private readonly logger = new Logger(
    WorkOrderProfitabilityReportService.name,
  );

  constructor(
    private readonly operationsReportingRepository: OperationsReportingRepository,
  ) {}

  async getReport(
    query: WorkOrderProfitabilityReportQueryDto,
  ): Promise<WorkOrderProfitabilityReportResponseDto> {
    const startedAt = Date.now();
    const loggerContext = buildSafeReportLoggerContext(
      'work-order-profitability',
      {
        customerId: query.customerId,
        assignedEmployeeId: query.assignedEmployeeId,
        status: query.status,
      },
      query,
    );

    try {
      const workOrders =
        await this.operationsReportingRepository.findWorkOrdersWithFinancials(
          query,
        );

      const data = workOrders.map((workOrder) =>
        mapWorkOrderProfitabilityRow(workOrder),
      );

      this.logger.log(
        JSON.stringify({
          ...loggerContext,
          resultCount: data.length,
          durationMs: Date.now() - startedAt,
        }),
      );

      return {
        approximate: true,
        basis: 'cash-operational',
        window: {
          dateFrom: query.dateFrom?.toISOString() ?? null,
          dateTo: query.dateTo?.toISOString() ?? null,
        },
        data,
      };
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          ...loggerContext,
          durationMs: Date.now() - startedAt,
        }),
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }
}

function mapWorkOrderProfitabilityRow(workOrder: WorkOrderFinancialReadModel) {
  const payableAmount = resolvePayableAmount(workOrder.WorkOrderEstimate);
  const paidTotal = sumAmounts(workOrder.WorkOrderPayment);
  const actualCostTotal = sumAmounts(workOrder.WorkOrderActualCost);

  return {
    workOrderId: workOrder.id,
    customerName: workOrder.Customer?.name ?? null,
    payableAmount,
    paidTotal,
    actualCostTotal,
    grossUtility: calculateGrossUtility({ payableAmount, actualCostTotal }),
    grossMargin: calculateGrossMargin({ payableAmount, actualCostTotal }),
  };
}

function sumAmounts(items: Array<{ amount: number }>) {
  return items.reduce((total, item) => total + item.amount, 0);
}
