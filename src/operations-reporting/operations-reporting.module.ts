import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma.service';

import { OperationsReportingController } from './operations-reporting.controller';
import { OperationsReportingRepository } from './persistence/operations-reporting.repository';
import { OPERATIONS_REPORTING_PRISMA_CLIENT } from './operations-reporting.tokens';
import { ExpensesBreakdownReportService } from './services/expenses-breakdown-report.service';
import { MechanicsProductivityReportService } from './services/mechanics-productivity-report.service';
import { PendingPaymentsReportService } from './services/pending-payments-report.service';
import { SummaryReportService } from './services/summary-report.service';
import { WorkOrderProfitabilityReportService } from './services/work-order-profitability-report.service';

@Module({
  imports: [PrismaModule],
  controllers: [OperationsReportingController],
  providers: [
    {
      provide: OPERATIONS_REPORTING_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
    OperationsReportingRepository,
    SummaryReportService,
    PendingPaymentsReportService,
    WorkOrderProfitabilityReportService,
    MechanicsProductivityReportService,
    ExpensesBreakdownReportService,
  ],
})
export class OperationsReportingModule {}
