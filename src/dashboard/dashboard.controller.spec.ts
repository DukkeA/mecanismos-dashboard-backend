import { RequestMethod, ValidationPipe } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { plainToInstance } from 'class-transformer';

jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { AppModule } from '../app.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DashboardOverviewQueryDto } from './dto/dashboard-overview-query.dto';
import { DashboardOverviewResponseDto } from './dto/dashboard-overview-response.dto';
import { DashboardController } from './dashboard.controller';
import { DashboardModule } from './dashboard.module';
import { DashboardOverviewService } from './dashboard.service';

type ApiResponseMetadata = Record<string, { type?: unknown }>;

describe('DashboardController', () => {
  const getOverview = jest.fn();
  const service = {
    getOverview,
  } as unknown as jest.Mocked<DashboardOverviewService>;

  let controller: DashboardController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DashboardController(service);
  });

  it('registers GET /dashboard/overview with ADMIN/SALES access, swagger response, and validation short-circuiting', async () => {
    const query = plainToInstance(DashboardOverviewQueryDto, {
      from: '2026-05-01T00:00:00.000Z',
      to: '2026-05-31T23:59:59.999Z',
    });
    const invalidQuery = plainToInstance(DashboardOverviewQueryDto, {
      from: '2026-05-31T00:00:00.000Z',
      to: '2026-05-01T00:00:00.000Z',
    });
    const response: DashboardOverviewResponseDto = {
      range: {
        from: '2026-05-01T00:00:00.000Z',
        to: '2026-05-31T23:59:59.999Z',
      },
      kpis: {
        workOrders: {
          open: 1,
          completed: 1,
          paused: 0,
          cancelled: 0,
        },
        cash: {
          collected: 100000,
          actualCosts: 20000,
          paidExpenses: 10000,
          pendingExpenses: 5000,
          pendingReceivables: 12000,
          approximateUtility: 70000,
        },
        inventory: {
          lowStockCount: 1,
        },
        payroll: {
          grandTotal: 2500000,
          status: 'FINALIZED',
          monthLabel: '2026-04',
        },
      },
      progress: {
        expenseCoverage: {
          paid: 100000,
          expected: 2515000,
          ratio: 100000 / 2515000,
          remaining: 2415000,
        },
        payrollCoverage: {
          covered: 100000,
          payrollTotal: 2500000,
          ratio: 0.04,
          remaining: 2400000,
        },
        receivablesCollection: {
          collected: 100000,
          knownPayable: 112000,
          ratio: 100000 / 112000,
          remaining: 12000,
          unknownPayableCount: 0,
        },
      },
      alerts: {
        pendingReceivables: 1,
        pendingExpensesDue: 1,
        lowStockItems: 1,
        unknownPayables: 0,
        previews: {
          pendingReceivables: [],
          pendingExpenses: [],
          lowStockItems: [],
        },
      },
      recentActivity: [],
      metadata: {
        approximate: false,
        basis: 'dashboard-overview',
        notes: [],
        sectionDateBasis: {
          workOrders: 'createdAt/completedAt',
          cash: 'paidAt/incurredAt/expectedAt',
          inventory: 'occurredAt',
          payroll: 'year-month overlap',
          recentActivity: 'occurredAt',
        },
      },
    };

    getOverview.mockResolvedValue(response);

    await expect(controller.getOverview(query)).resolves.toEqual(response);

    await expect(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }).transform(invalidQuery, {
        type: 'query',
        metatype: DashboardOverviewQueryDto,
      }),
    ).rejects.toMatchObject({ status: 400 });

    expect(getOverview).toHaveBeenCalledWith(query);
    expect(getOverview).toHaveBeenCalledTimes(1);

    expect(Reflect.getMetadata(PATH_METADATA, DashboardController)).toBe(
      'dashboard',
    );
    expect(Reflect.getMetadata(ROLES_KEY, DashboardController)).toEqual([
      'ADMIN',
      'SALES',
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, DashboardController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);

    const overviewHandler = getControllerMethod('getOverview');

    expect(Reflect.getMetadata(PATH_METADATA, overviewHandler)).toBe(
      'overview',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, overviewHandler)).toBe(
      RequestMethod.GET,
    );

    const responseMetadata = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      overviewHandler,
    ) as ApiResponseMetadata | undefined;

    expect(responseMetadata?.['200']).toEqual(
      expect.objectContaining({
        type: DashboardOverviewResponseDto,
      }),
    );

    const dashboardModuleControllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      DashboardModule,
    ) as unknown[];
    const dashboardModuleProviders = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      DashboardModule,
    ) as unknown[];
    const appModuleImports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    ) as unknown[];

    expect(dashboardModuleControllers).toContain(DashboardController);
    expect(dashboardModuleProviders).toEqual(
      expect.arrayContaining([DashboardOverviewService]),
    );
    expect(appModuleImports).toContain(DashboardModule);
  });
});

function getControllerMethod(methodName: keyof DashboardController): object {
  const descriptor = Object.getOwnPropertyDescriptor(
    DashboardController.prototype,
    methodName,
  );

  expect(descriptor?.value).toBeDefined();

  return descriptor?.value as object;
}
