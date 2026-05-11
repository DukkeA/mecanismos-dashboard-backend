import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { MODULE_METADATA } from '@nestjs/common/constants';

jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { AppModule } from '../app.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
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
import { OperationsReportingController } from './operations-reporting.controller';
import { OperationsReportingModule } from './operations-reporting.module';

describe('OperationsReportingController', () => {
  const summaryService = {
    getReport: jest.fn(),
  } as unknown as jest.Mocked<SummaryReportService>;
  const pendingPaymentsService = {
    getReport: jest.fn(),
  } as unknown as jest.Mocked<PendingPaymentsReportService>;
  const workOrderProfitabilityService = {
    getReport: jest.fn(),
  } as unknown as jest.Mocked<WorkOrderProfitabilityReportService>;
  const mechanicsProductivityService = {
    getReport: jest.fn(),
  } as unknown as jest.Mocked<MechanicsProductivityReportService>;
  const expensesBreakdownService = {
    getReport: jest.fn(),
  } as unknown as jest.Mocked<ExpensesBreakdownReportService>;

  let controller: OperationsReportingController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new OperationsReportingController(
      summaryService,
      pendingPaymentsService,
      workOrderProfitabilityService,
      mechanicsProductivityService,
      expensesBreakdownService,
    );
  });

  it('registers ADMIN/SALES JSON report routes and app wiring', async () => {
    const summaryQuery = {} as SummaryReportQueryDto;
    const pendingPaymentsQuery = {} as PendingPaymentsReportQueryDto;
    const profitabilityQuery = {} as WorkOrderProfitabilityReportQueryDto;
    const mechanicsQuery = {} as MechanicsProductivityReportQueryDto;
    const expensesQuery = {} as ExpensesBreakdownReportQueryDto;

    const summaryResponse: SummaryReportResponseDto = {
      approximate: true,
      basis: 'cash-operational',
      window: { dateFrom: null, dateTo: null },
      totals: {
        workOrders: {
          inProgress: 0,
          paused: 0,
          completed: 0,
          cancelled: 0,
        },
        paymentStatus: {
          pending: 0,
          partial: 0,
          paid: 0,
        },
        paymentsCollected: 0,
        pendingReceivables: null,
        actualCosts: 0,
        paidExpenses: 0,
        pendingExpenses: 0,
        approximateUtility: 0,
      },
    };
    const pendingPaymentsResponse: PendingPaymentsReportResponseDto = {
      approximate: true,
      basis: 'cash-operational',
      window: { dateFrom: null, dateTo: null },
      data: [],
    };
    const profitabilityResponse: WorkOrderProfitabilityReportResponseDto = {
      approximate: true,
      basis: 'cash-operational',
      window: { dateFrom: null, dateTo: null },
      data: [],
    };
    const mechanicsResponse: MechanicsProductivityReportResponseDto = {
      approximate: true,
      basis: 'cash-operational',
      window: { dateFrom: null, dateTo: null },
      data: [],
    };
    const expensesResponse: ExpensesBreakdownReportResponseDto = {
      approximate: true,
      basis: 'cash-operational',
      window: { dateFrom: null, dateTo: null },
      data: [],
    };

    summaryService.getReport.mockResolvedValue(summaryResponse);
    pendingPaymentsService.getReport.mockResolvedValue(pendingPaymentsResponse);
    workOrderProfitabilityService.getReport.mockResolvedValue(
      profitabilityResponse,
    );
    mechanicsProductivityService.getReport.mockResolvedValue(mechanicsResponse);
    expensesBreakdownService.getReport.mockResolvedValue(expensesResponse);

    await expect(controller.getSummary(summaryQuery)).resolves.toEqual(
      summaryResponse,
    );
    await expect(
      controller.getPendingPayments(pendingPaymentsQuery),
    ).resolves.toEqual(pendingPaymentsResponse);
    await expect(
      controller.getWorkOrderProfitability(profitabilityQuery),
    ).resolves.toEqual(profitabilityResponse);
    await expect(controller.getMechanics(mechanicsQuery)).resolves.toEqual(
      mechanicsResponse,
    );
    await expect(controller.getExpenses(expensesQuery)).resolves.toEqual(
      expensesResponse,
    );

    expect(
      Reflect.getMetadata(PATH_METADATA, OperationsReportingController),
    ).toBe('operations-reporting');
    expect(
      Reflect.getMetadata(ROLES_KEY, OperationsReportingController),
    ).toEqual(['ADMIN', 'SALES']);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, OperationsReportingController),
    ).toEqual([JwtAuthGuard, RolesGuard]);

    const summaryHandler = Object.getOwnPropertyDescriptor(
      OperationsReportingController.prototype,
      'getSummary',
    )?.value;
    const pendingPaymentsHandler = Object.getOwnPropertyDescriptor(
      OperationsReportingController.prototype,
      'getPendingPayments',
    )?.value;
    const workOrderProfitabilityHandler = Object.getOwnPropertyDescriptor(
      OperationsReportingController.prototype,
      'getWorkOrderProfitability',
    )?.value;
    const mechanicsHandler = Object.getOwnPropertyDescriptor(
      OperationsReportingController.prototype,
      'getMechanics',
    )?.value;
    const expensesHandler = Object.getOwnPropertyDescriptor(
      OperationsReportingController.prototype,
      'getExpenses',
    )?.value;

    expect(Reflect.getMetadata(PATH_METADATA, summaryHandler as object)).toBe(
      'summary',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, summaryHandler as object)).toBe(
      RequestMethod.GET,
    );
    expect(
      Reflect.getMetadata(PATH_METADATA, pendingPaymentsHandler as object),
    ).toBe('pending-payments');
    expect(
      Reflect.getMetadata(METHOD_METADATA, pendingPaymentsHandler as object),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        workOrderProfitabilityHandler as object,
      ),
    ).toBe('work-order-profitability');
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        workOrderProfitabilityHandler as object,
      ),
    ).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, mechanicsHandler as object)).toBe(
      'mechanics',
    );
    expect(
      Reflect.getMetadata(METHOD_METADATA, mechanicsHandler as object),
    ).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, expensesHandler as object)).toBe(
      'expenses',
    );
    expect(
      Reflect.getMetadata(METHOD_METADATA, expensesHandler as object),
    ).toBe(RequestMethod.GET);

    expect(summaryService.getReport.mock.calls[0]).toEqual([summaryQuery]);
    expect(pendingPaymentsService.getReport.mock.calls[0]).toEqual([
      pendingPaymentsQuery,
    ]);
    expect(workOrderProfitabilityService.getReport.mock.calls[0]).toEqual([
      profitabilityQuery,
    ]);
    expect(mechanicsProductivityService.getReport.mock.calls[0]).toEqual([
      mechanicsQuery,
    ]);
    expect(expensesBreakdownService.getReport.mock.calls[0]).toEqual([
      expensesQuery,
    ]);

    const operationsReportingModuleControllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      OperationsReportingModule,
    ) as unknown[];
    const operationsReportingModuleProviders = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      OperationsReportingModule,
    ) as unknown[];
    const appModuleImports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    ) as unknown[];

    expect(operationsReportingModuleControllers).toContain(
      OperationsReportingController,
    );
    expect(operationsReportingModuleProviders).toEqual(
      expect.arrayContaining([
        SummaryReportService,
        PendingPaymentsReportService,
        WorkOrderProfitabilityReportService,
        MechanicsProductivityReportService,
        ExpensesBreakdownReportService,
      ]),
    );
    expect(appModuleImports).toContain(OperationsReportingModule);
  });
});
