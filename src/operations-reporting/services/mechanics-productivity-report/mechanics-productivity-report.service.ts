import { Injectable, Logger } from '@nestjs/common';

import {
  calculateGrossUtility,
  resolvePayableAmount,
} from '../../calculations/operations-reporting.calculations';
import { MechanicsProductivityReportQueryDto } from '../../dto/mechanics-productivity-report-query.dto';
import { MechanicsProductivityReportResponseDto } from '../../dto/mechanics-productivity-report-response.dto';
import { buildSafeReportLoggerContext } from '../../observability/operations-reporting-logger';
import {
  OperationsReportingRepository,
  type MechanicAssignmentsReadModel,
} from '../../persistence/operations-reporting.repository';

@Injectable()
export class MechanicsProductivityReportService {
  private readonly logger = new Logger(MechanicsProductivityReportService.name);

  constructor(
    private readonly operationsReportingRepository: OperationsReportingRepository,
  ) {}

  async getReport(
    query: MechanicsProductivityReportQueryDto,
  ): Promise<MechanicsProductivityReportResponseDto> {
    const startedAt = Date.now();
    const loggerContext = buildSafeReportLoggerContext(
      'mechanics',
      {
        assignedEmployeeId: query.assignedEmployeeId,
        employeeType: query.employeeType,
        includeInactiveMechanics: query.includeInactiveMechanics,
      },
      query,
    );

    try {
      const mechanics =
        await this.operationsReportingRepository.findMechanicsWithAssignments({
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
          assignedEmployeeId: query.assignedEmployeeId,
          includeInactiveMechanics: query.includeInactiveMechanics,
        });

      const data = mechanics
        .map((mechanic) => mapMechanicProductivityRow(mechanic))
        .filter((mechanic) => mechanic.assignedOrderCount > 0);

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

function mapMechanicProductivityRow(mechanic: MechanicAssignmentsReadModel) {
  const actualCosts = mechanic.WorkOrder.reduce(
    (total, workOrder) => total + sumAmounts(workOrder.WorkOrderActualCost),
    0,
  );
  const paidTotal = mechanic.WorkOrder.reduce(
    (total, workOrder) => total + sumAmounts(workOrder.WorkOrderPayment),
    0,
  );

  const payableAmounts = mechanic.WorkOrder.map((workOrder) =>
    resolvePayableAmount(workOrder.WorkOrderEstimate),
  );
  const knownPayableAmounts = payableAmounts.filter(
    (amount): amount is number => amount !== null,
  );
  const payableTotal =
    knownPayableAmounts.length > 0
      ? knownPayableAmounts.reduce((total, amount) => total + amount, 0)
      : null;

  return {
    employeeId: mechanic.id,
    employeeName: mechanic.name,
    assignedOrderCount: mechanic.WorkOrder.length,
    payableTotal,
    paidTotal,
    actualCosts,
    grossUtility: calculateGrossUtility({ payableAmount: payableTotal, actualCostTotal: actualCosts }),
    unknownPayableCount: payableAmounts.filter((amount) => amount === null).length,
  };
}

function sumAmounts(items: Array<{ amount: number }>) {
  return items.reduce((total, item) => total + item.amount, 0);
}
