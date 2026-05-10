import { Injectable, Logger } from '@nestjs/common';
import { PaymentStatus } from '../../../../generated/prisma/enums';
import {
  calculateBalance,
  isOverpaid,
  resolvePayableAmount,
} from '../../calculations/operations-reporting.calculations';
import { PendingPaymentsReportQueryDto } from '../../dto/pending-payments-report-query.dto';
import { PendingPaymentsReportResponseDto } from '../../dto/pending-payments-report-response.dto';
import { buildSafeReportLoggerContext } from '../../observability/operations-reporting-logger';
import {
  OperationsReportingRepository,
  WorkOrderFinancialReadModel,
} from '../../persistence/operations-reporting.repository';

@Injectable()
export class PendingPaymentsReportService {
  private readonly logger = new Logger(PendingPaymentsReportService.name);

  constructor(
    private readonly repository: OperationsReportingRepository,
  ) {}

  async getReport(
    query: PendingPaymentsReportQueryDto,
  ): Promise<PendingPaymentsReportResponseDto> {
    const context = buildSafeReportLoggerContext('pending-payments', query, query);

    try {
      const workOrders = await this.repository.findWorkOrdersWithFinancials(query);
      const rows = workOrders
        .filter(
          (workOrder) =>
            workOrder.paymentStatus === PaymentStatus.PENDING ||
            workOrder.paymentStatus === PaymentStatus.PARTIAL,
        )
        .map((workOrder) => buildPendingPaymentsRow(workOrder));

      this.logger.log(
        `report=pending-payments completed ${JSON.stringify(context)} resultCount=${rows.length}`,
      );

      return {
        approximate: true,
        basis: 'cash-operational',
        window: {
          dateFrom: query.dateFrom?.toISOString() ?? null,
          dateTo: query.dateTo?.toISOString() ?? null,
        },
        data: rows,
      };
    } catch (error) {
      this.logger.error(
        `report=pending-payments failed ${JSON.stringify(context)}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }
}

function buildPendingPaymentsRow(workOrder: WorkOrderFinancialReadModel) {
  const payableAmount = resolvePayableAmount(workOrder.WorkOrderEstimate);
  const paidTotal = workOrder.WorkOrderPayment.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  const overpaid = isOverpaid({ payableAmount, paidTotal });
  const balance = calculateBalance({ payableAmount, paidTotal });

  return {
    workOrderId: workOrder.id,
    customerId: workOrder.Customer?.id ?? workOrder.customerId ?? null,
    customerName: workOrder.Customer?.name ?? null,
    assetLabel: buildAssetLabel(workOrder),
    status: workOrder.status,
    paymentStatus: workOrder.paymentStatus,
    payableAmount,
    paidTotal,
    balance: balance === null ? null : Math.max(balance, 0),
    overpaid,
  };
}

function buildAssetLabel(workOrder: WorkOrderFinancialReadModel) {
  if (workOrder.Vehicle) {
    return [
      `${workOrder.Vehicle.brand} ${workOrder.Vehicle.modelReference}`,
      workOrder.Vehicle.plate,
    ].join(' · ');
  }

  if (workOrder.Component) {
    const reference = workOrder.Component.identifier
      ? `${workOrder.Component.reference} · ${workOrder.Component.identifier}`
      : workOrder.Component.reference;

    return `${workOrder.Component.brand} ${reference}`;
  }

  return null;
}
