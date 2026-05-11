import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

import { ExpensesBreakdownReportQueryDto } from './dto/expenses-breakdown-report-query.dto';
import { ExpensesBreakdownReportResponseDto } from './dto/expenses-breakdown-report-response.dto';
import { MechanicsProductivityReportQueryDto } from './dto/mechanics-productivity-report-query.dto';
import { MechanicsProductivityReportResponseDto } from './dto/mechanics-productivity-report-response.dto';
import { PendingPaymentsReportQueryDto } from './dto/pending-payments-report-query.dto';
import { PendingPaymentsReportResponseDto } from './dto/pending-payments-report-response.dto';
import { SummaryReportQueryDto } from './dto/summary-report-query.dto';
import { SummaryReportResponseDto } from './dto/summary-report-response.dto';
import { WorkOrderProfitabilityReportQueryDto } from './dto/work-order-profitability-report-query.dto';
import { WorkOrderProfitabilityReportResponseDto } from './dto/work-order-profitability-report-response.dto';
import { ExpensesBreakdownReportService } from './services/expenses-breakdown-report.service';
import { MechanicsProductivityReportService } from './services/mechanics-productivity-report.service';
import { PendingPaymentsReportService } from './services/pending-payments-report.service';
import { SummaryReportService } from './services/summary-report.service';
import { WorkOrderProfitabilityReportService } from './services/work-order-profitability-report.service';

@ApiTags('operations-reporting')
@ApiCookieAuth('md_access')
@Controller('operations-reporting')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SALES')
export class OperationsReportingController {
  constructor(
    private readonly summaryReportService: SummaryReportService,
    private readonly pendingPaymentsReportService: PendingPaymentsReportService,
    private readonly workOrderProfitabilityReportService: WorkOrderProfitabilityReportService,
    private readonly mechanicsProductivityReportService: MechanicsProductivityReportService,
    private readonly expensesBreakdownReportService: ExpensesBreakdownReportService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get the operational dashboard summary report' })
  @ApiOkResponse({ type: SummaryReportResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  getSummary(@Query() query: SummaryReportQueryDto) {
    return this.summaryReportService.getReport(query);
  }

  @Get('pending-payments')
  @ApiOperation({ summary: 'Get pending payment and receivable rows' })
  @ApiOkResponse({ type: PendingPaymentsReportResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  getPendingPayments(@Query() query: PendingPaymentsReportQueryDto) {
    return this.pendingPaymentsReportService.getReport(query);
  }

  @Get('work-order-profitability')
  @ApiOperation({ summary: 'Get work-order profitability rows' })
  @ApiOkResponse({ type: WorkOrderProfitabilityReportResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  getWorkOrderProfitability(
    @Query() query: WorkOrderProfitabilityReportQueryDto,
  ) {
    return this.workOrderProfitabilityReportService.getReport(query);
  }

  @Get('mechanics')
  @ApiOperation({
    summary: 'Get mechanics productivity and profitability rows',
  })
  @ApiOkResponse({ type: MechanicsProductivityReportResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  getMechanics(@Query() query: MechanicsProductivityReportQueryDto) {
    return this.mechanicsProductivityReportService.getReport(query);
  }

  @Get('expenses')
  @ApiOperation({ summary: 'Get expenses grouped for operations reporting' })
  @ApiOkResponse({ type: ExpensesBreakdownReportResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  getExpenses(@Query() query: ExpensesBreakdownReportQueryDto) {
    return this.expensesBreakdownReportService.getReport(query);
  }
}
