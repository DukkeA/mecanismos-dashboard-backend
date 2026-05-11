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
import { CustomerAssetHistoryQueryDto } from './dto/customer-asset-history-query.dto';
import { CustomerAssetHistoryResponseDto } from './dto/customer-asset-history-response.dto';
import { CustomerAssetHistoryController } from './customer-asset-history.controller';
import { CustomerAssetHistoryModule } from './customer-asset-history.module';
import { CustomerAssetHistoryService } from './customer-asset-history.service';

function getControllerMethod(
  methodName: keyof CustomerAssetHistoryController,
): object {
  const descriptor = Object.getOwnPropertyDescriptor(
    CustomerAssetHistoryController.prototype,
    methodName,
  );

  expect(descriptor?.value).toBeDefined();

  return descriptor?.value as object;
}

describe('CustomerAssetHistoryController', () => {
  const service = {
    getCustomerHistory: jest.fn(),
    getVehicleHistory: jest.fn(),
    getComponentHistory: jest.fn(),
  } as unknown as jest.Mocked<CustomerAssetHistoryService>;

  let controller: CustomerAssetHistoryController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CustomerAssetHistoryController(service);
  });

  it('registers guarded GET-only routes for customer, vehicle, and component history', async () => {
    const query = {} as CustomerAssetHistoryQueryDto;
    const response = {
      subject: { id: 'subject-1', scope: 'CUSTOMER', label: 'Ana Gomez' },
      relatedAssets: { vehicles: [], components: [] },
      summary: {
        totalWorkOrders: 0,
        unknownPayableCount: 0,
        payableAmount: 0,
        paidTotal: 0,
        balance: 0,
        actualCostTotal: 0,
      },
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    } satisfies CustomerAssetHistoryResponseDto;

    service.getCustomerHistory.mockResolvedValue(response);
    service.getVehicleHistory.mockResolvedValue(response);
    service.getComponentHistory.mockResolvedValue(response);

    await expect(
      controller.getCustomerHistory('customer-1', query),
    ).resolves.toEqual(response);
    await expect(
      controller.getVehicleHistory('vehicle-1', query),
    ).resolves.toEqual(response);
    await expect(
      controller.getComponentHistory('component-1', query),
    ).resolves.toEqual(response);

    expect(
      Reflect.getMetadata(PATH_METADATA, CustomerAssetHistoryController),
    ).toBe('customer-asset-history');
    expect(
      Reflect.getMetadata(ROLES_KEY, CustomerAssetHistoryController),
    ).toEqual(['ADMIN', 'SALES']);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, CustomerAssetHistoryController),
    ).toEqual([JwtAuthGuard, RolesGuard]);

    const customerHandler = getControllerMethod('getCustomerHistory');
    const vehicleHandler = getControllerMethod('getVehicleHistory');
    const componentHandler = getControllerMethod('getComponentHistory');

    expect(Reflect.getMetadata(PATH_METADATA, customerHandler)).toBe(
      'customers/:customerId',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, customerHandler)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, vehicleHandler)).toBe(
      'vehicles/:vehicleId',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, vehicleHandler)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, componentHandler)).toBe(
      'components/:componentId',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, componentHandler)).toBe(
      RequestMethod.GET,
    );

    expect(service.getCustomerHistory.mock.calls[0]).toEqual([
      'customer-1',
      query,
    ]);
    expect(service.getVehicleHistory.mock.calls[0]).toEqual([
      'vehicle-1',
      query,
    ]);
    expect(service.getComponentHistory.mock.calls[0]).toEqual([
      'component-1',
      query,
    ]);

    const controllerMethodNames = Object.getOwnPropertyNames(
      CustomerAssetHistoryController.prototype,
    ).filter((name) => name !== 'constructor');
    expect(controllerMethodNames).toEqual([
      'getCustomerHistory',
      'getVehicleHistory',
      'getComponentHistory',
    ]);

    const moduleControllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      CustomerAssetHistoryModule,
    ) as unknown[];
    const moduleProviders = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      CustomerAssetHistoryModule,
    ) as unknown[];
    const appModuleImports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    ) as unknown[];

    expect(moduleControllers).toContain(CustomerAssetHistoryController);
    expect(moduleProviders).toContain(CustomerAssetHistoryService);
    expect(appModuleImports).toContain(CustomerAssetHistoryModule);
  });
});
