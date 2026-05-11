import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
jest.mock('../../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ROLES_KEY } from '../../auth/roles.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { ComponentTypesController } from '../../component-types/component-types.controller';
import { ComponentsController } from '../../components/components.controller';
import { CostCentersController } from '../../cost-centers/cost-centers.controller';
import { CustomersController } from '../../customers/customers.controller';
import { EmployeesController } from '../../employees/employees.controller';
import { InventoryItemsController } from '../../inventory/inventory-items.controller';
import { ProcurementService } from '../../procurement/procurement.service';
import { ServicesController } from '../../services/services.controller';
import { SuppliersController } from '../../suppliers/suppliers.controller';
import { VehiclesController } from '../../vehicles/vehicles.controller';

describe('reference-data controller routes', () => {
  it('registers options and quick-create routes behind ADMIN and SALES guards', async () => {
    const customersService = {
      findOptions: jest
        .fn()
        .mockResolvedValue({ data: [], meta: { limit: 10 } }),
      quickCreate: jest.fn().mockResolvedValue({ data: { id: 'customer-1' } }),
    };
    const vehiclesService = {
      findOptions: jest
        .fn()
        .mockResolvedValue({ data: [], meta: { limit: 10 } }),
      quickCreate: jest.fn().mockResolvedValue({ data: { id: 'vehicle-1' } }),
    };
    const componentsService = {
      findOptions: jest
        .fn()
        .mockResolvedValue({ data: [], meta: { limit: 10 } }),
      quickCreate: jest.fn().mockResolvedValue({ data: { id: 'component-1' } }),
    };
    const componentTypesService = {
      findOptions: jest
        .fn()
        .mockResolvedValue({ data: [], meta: { limit: 10 } }),
    };
    const servicesService = {
      findOptions: jest
        .fn()
        .mockResolvedValue({ data: [], meta: { limit: 10 } }),
      quickCreate: jest.fn().mockResolvedValue({ data: { id: 'service-1' } }),
    };
    const suppliersService = {
      findOptions: jest
        .fn()
        .mockResolvedValue({ data: [], meta: { limit: 10 } }),
      quickCreate: jest.fn().mockResolvedValue({ data: { id: 'supplier-1' } }),
    };
    const inventoryService = {
      findItemOptions: jest
        .fn()
        .mockResolvedValue({ data: [], meta: { limit: 10 } }),
      quickCreateItem: jest.fn().mockResolvedValue({ data: { id: 'item-1' } }),
    };
    const employeesService = {
      findOptions: jest
        .fn()
        .mockResolvedValue({ data: [], meta: { limit: 10 } }),
      listCostCenterOptions: jest
        .fn()
        .mockResolvedValue({ data: [], meta: { limit: 10 } }),
      quickCreate: jest.fn().mockResolvedValue({ data: { id: 'employee-1' } }),
    };
    const costCentersService = {
      findOptions: jest
        .fn()
        .mockResolvedValue({ data: [], meta: { limit: 10 } }),
      quickCreate: jest
        .fn()
        .mockResolvedValue({ data: { id: 'cost-center-1' } }),
    };
    const procurementService = {
      findSupplierQuoteTimeline: jest.fn(),
      findItemQuoteLookup: jest.fn(),
    } as unknown as ProcurementService;

    const customersController = new CustomersController(
      customersService as never,
    );
    const vehiclesController = new VehiclesController(vehiclesService as never);
    const componentsController = new ComponentsController(
      componentsService as never,
    );
    const componentTypesController = new ComponentTypesController(
      componentTypesService as never,
    );
    const servicesController = new ServicesController(servicesService as never);
    const suppliersController = new SuppliersController(
      suppliersService as never,
      procurementService,
    );
    const inventoryItemsController = new InventoryItemsController(
      inventoryService as never,
      procurementService,
    );
    const employeesController = new EmployeesController(
      employeesService as never,
    );
    const costCentersController = new CostCentersController(
      costCentersService as never,
    );

    await expect(
      customersController.findOptions({ limit: 10 }),
    ).resolves.toEqual({
      data: [],
      meta: { limit: 10 },
    });
    await expect(
      customersController.createQuick({ name: 'Ana' } as never),
    ).resolves.toEqual({
      data: { id: 'customer-1' },
    });
    await expect(
      vehiclesController.findOptions({ limit: 10 }),
    ).resolves.toEqual({
      data: [],
      meta: { limit: 10 },
    });
    await expect(
      vehiclesController.createQuick({ brand: 'Mazda' } as never),
    ).resolves.toEqual({
      data: { id: 'vehicle-1' },
    });
    await expect(
      componentsController.findOptions({ limit: 10 }),
    ).resolves.toEqual({
      data: [],
      meta: { limit: 10 },
    });
    await expect(
      componentsController.createQuick({ brand: 'Bosch' } as never),
    ).resolves.toEqual({ data: { id: 'component-1' } });
    await expect(
      componentTypesController.findOptions({ limit: 10 }),
    ).resolves.toEqual({ data: [], meta: { limit: 10 } });
    await expect(
      servicesController.findOptions({ limit: 10 }),
    ).resolves.toEqual({
      data: [],
      meta: { limit: 10 },
    });
    await expect(
      servicesController.createQuick({ name: 'Diag' }),
    ).resolves.toEqual({
      data: { id: 'service-1' },
    });
    await expect(
      suppliersController.findOptions({ limit: 10 }),
    ).resolves.toEqual({
      data: [],
      meta: { limit: 10 },
    });
    await expect(
      suppliersController.createQuick({ name: 'Proveedor' } as never),
    ).resolves.toEqual({ data: { id: 'supplier-1' } });
    await expect(
      inventoryItemsController.findOptions({ limit: 10 }),
    ).resolves.toEqual({ data: [], meta: { limit: 10 } });
    await expect(
      inventoryItemsController.createQuick({ name: 'Item' } as never),
    ).resolves.toEqual({ data: { id: 'item-1' } });
    await expect(
      employeesController.findOptions({ limit: 10 }),
    ).resolves.toEqual({
      data: [],
      meta: { limit: 10 },
    });
    await expect(employeesController.listCostCenterOptions()).resolves.toEqual({
      data: [],
      meta: { limit: 10 },
    });
    await expect(
      employeesController.createQuick({ name: 'Ana' } as never),
    ).resolves.toEqual({ data: { id: 'employee-1' } });
    await expect(
      costCentersController.findOptions({ limit: 10 }),
    ).resolves.toEqual({ data: [], meta: { limit: 10 } });
    await expect(
      costCentersController.createQuick({ code: 'GENERAL' } as never),
    ).resolves.toEqual({ data: { id: 'cost-center-1' } });

    expectProtectedController(CustomersController, 'customers');
    expectRoute(
      CustomersController,
      'findOptions',
      RequestMethod.GET,
      'options',
    );
    expectRoute(
      CustomersController,
      'createQuick',
      RequestMethod.POST,
      'quick-create',
    );

    expectProtectedController(VehiclesController, 'vehicles');
    expectRoute(
      VehiclesController,
      'findOptions',
      RequestMethod.GET,
      'options',
    );
    expectRoute(
      VehiclesController,
      'createQuick',
      RequestMethod.POST,
      'quick-create',
    );

    expectProtectedController(ComponentsController, 'components');
    expectRoute(
      ComponentsController,
      'findOptions',
      RequestMethod.GET,
      'options',
    );
    expectRoute(
      ComponentsController,
      'createQuick',
      RequestMethod.POST,
      'quick-create',
    );

    expectProtectedController(ComponentTypesController, 'component-types');
    expectRoute(
      ComponentTypesController,
      'findOptions',
      RequestMethod.GET,
      'options',
    );

    expectProtectedController(ServicesController, 'services');
    expectRoute(
      ServicesController,
      'findOptions',
      RequestMethod.GET,
      'options',
    );
    expectRoute(
      ServicesController,
      'createQuick',
      RequestMethod.POST,
      'quick-create',
    );

    expectProtectedController(SuppliersController, 'suppliers');
    expectRoute(
      SuppliersController,
      'findOptions',
      RequestMethod.GET,
      'options',
    );
    expectRoute(
      SuppliersController,
      'createQuick',
      RequestMethod.POST,
      'quick-create',
    );

    expectProtectedController(InventoryItemsController, 'inventory-items');
    expectRoute(
      InventoryItemsController,
      'findOptions',
      RequestMethod.GET,
      'options',
    );
    expectRoute(
      InventoryItemsController,
      'createQuick',
      RequestMethod.POST,
      'quick-create',
    );

    expectProtectedController(EmployeesController, 'employees');
    expectRoute(
      EmployeesController,
      'findOptions',
      RequestMethod.GET,
      'options',
    );
    expectRoute(
      EmployeesController,
      'listCostCenterOptions',
      RequestMethod.GET,
      'cost-center-options',
    );
    expectRoute(
      EmployeesController,
      'createQuick',
      RequestMethod.POST,
      'quick-create',
    );

    expectProtectedController(CostCentersController, 'cost-centers');
    expectRoute(
      CostCentersController,
      'findOptions',
      RequestMethod.GET,
      'options',
    );
    expectRoute(
      CostCentersController,
      'createQuick',
      RequestMethod.POST,
      'quick-create',
    );

    expect(customersService.findOptions).toHaveBeenCalledWith({ limit: 10 });
    expect(customersService.quickCreate).toHaveBeenCalledWith({ name: 'Ana' });
    expect(vehiclesService.findOptions).toHaveBeenCalledWith({ limit: 10 });
    expect(vehiclesService.quickCreate).toHaveBeenCalledWith({
      brand: 'Mazda',
    });
    expect(componentsService.findOptions).toHaveBeenCalledWith({ limit: 10 });
    expect(componentsService.quickCreate).toHaveBeenCalledWith({
      brand: 'Bosch',
    });
    expect(componentTypesService.findOptions).toHaveBeenCalledWith({
      limit: 10,
    });
    expect(servicesService.findOptions).toHaveBeenCalledWith({ limit: 10 });
    expect(servicesService.quickCreate).toHaveBeenCalledWith({ name: 'Diag' });
    expect(suppliersService.findOptions).toHaveBeenCalledWith({ limit: 10 });
    expect(suppliersService.quickCreate).toHaveBeenCalledWith({
      name: 'Proveedor',
    });
    expect(inventoryService.findItemOptions).toHaveBeenCalledWith({
      limit: 10,
    });
    expect(inventoryService.quickCreateItem).toHaveBeenCalledWith({
      name: 'Item',
    });
    expect(employeesService.findOptions).toHaveBeenCalledWith({ limit: 10 });
    expect(employeesService.listCostCenterOptions).toHaveBeenCalledWith();
    expect(employeesService.quickCreate).toHaveBeenCalledWith({ name: 'Ana' });
    expect(costCentersService.findOptions).toHaveBeenCalledWith({ limit: 10 });
    expect(costCentersService.quickCreate).toHaveBeenCalledWith({
      code: 'GENERAL',
    });
  });
});

function expectProtectedController(controller: object, path: string) {
  expect(Reflect.getMetadata(PATH_METADATA, controller)).toBe(path);
  expect(Reflect.getMetadata(ROLES_KEY, controller)).toEqual([
    'ADMIN',
    'SALES',
  ]);
  expect(Reflect.getMetadata(GUARDS_METADATA, controller)).toEqual([
    JwtAuthGuard,
    RolesGuard,
  ]);
}

function expectRoute(
  controller: { prototype: object },
  methodName: string,
  method: RequestMethod,
  path: string,
) {
  const descriptor = Object.getOwnPropertyDescriptor(
    controller.prototype,
    methodName,
  );

  expect(descriptor?.value).toBeDefined();
  const handler = descriptor?.value as object;
  expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
  expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
}
