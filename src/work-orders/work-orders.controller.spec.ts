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

import { ROLES_KEY } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AppModule } from '../app.module';
import { CreateWorkOrderActualCostDto } from './dto/create-work-order-actual-cost.dto';
import {
  ConsumeWorkOrderInventoryDto,
  ReleaseWorkOrderInventoryDto,
  ReserveWorkOrderInventoryDto,
  SellWorkOrderInventoryDto,
} from './dto/work-order-inventory-action.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { CreateWorkOrderPaymentDto } from './dto/create-work-order-payment.dto';
import { ListWorkOrdersQueryDto } from './dto/list-work-orders-query.dto';
import { UpdateWorkOrderActualCostDto } from './dto/update-work-order-actual-cost.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { UpdateWorkOrderPaymentDto } from './dto/update-work-order-payment.dto';
import { UpsertWorkOrderEstimateDto } from './dto/upsert-work-order-estimate.dto';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersModule } from './work-orders.module';
import { WorkOrdersService } from './work-orders.service';

function getControllerMethod(methodName: keyof WorkOrdersController): object {
  const descriptor = Object.getOwnPropertyDescriptor(
    WorkOrdersController.prototype,
    methodName,
  );

  expect(descriptor?.value).toBeDefined();

  return descriptor?.value as object;
}

describe('WorkOrdersController', () => {
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    upsertEstimate: jest.fn(),
    findEstimates: jest.fn(),
    createActualCost: jest.fn(),
    findActualCosts: jest.fn(),
    updateActualCost: jest.fn(),
    removeActualCost: jest.fn(),
    reserveInventory: jest.fn(),
    releaseInventory: jest.fn(),
    consumeInventory: jest.fn(),
    sellInventory: jest.fn(),
    createPayment: jest.fn(),
    findPayments: jest.fn(),
    updatePayment: jest.fn(),
    removePayment: jest.fn(),
  } as unknown as jest.Mocked<WorkOrdersService>;

  let controller: WorkOrdersController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new WorkOrdersController(service);
  });

  it('registers protected work-order routes for lifecycle, estimates, costs, and payments', async () => {
    const createDto = {} as CreateWorkOrderDto;
    const listDto = {} as ListWorkOrdersQueryDto;
    const updateDto = {} as UpdateWorkOrderDto;
    const estimateDto = {} as UpsertWorkOrderEstimateDto;
    const createCostDto = {} as CreateWorkOrderActualCostDto;
    const updateCostDto = {} as UpdateWorkOrderActualCostDto;
    const reserveInventoryDto = {} as ReserveWorkOrderInventoryDto;
    const releaseInventoryDto = {} as ReleaseWorkOrderInventoryDto;
    const consumeInventoryDto = {} as ConsumeWorkOrderInventoryDto;
    const sellInventoryDto = {} as SellWorkOrderInventoryDto;
    const createPaymentDto = {} as CreateWorkOrderPaymentDto;
    const updatePaymentDto = {} as UpdateWorkOrderPaymentDto;

    service.create.mockResolvedValue({ id: 'wo-1' } as never);
    service.findAll.mockResolvedValue({ data: [], meta: {} } as never);
    service.findOne.mockResolvedValue({ id: 'wo-1' } as never);
    service.update.mockResolvedValue({ id: 'wo-1' } as never);
    service.upsertEstimate.mockResolvedValue({ id: 'estimate-1' } as never);
    service.findEstimates.mockResolvedValue({ data: [] });
    service.createActualCost.mockResolvedValue({ id: 'cost-1' } as never);
    service.findActualCosts.mockResolvedValue({ data: [] });
    service.updateActualCost.mockResolvedValue({ id: 'cost-1' } as never);
    service.removeActualCost.mockResolvedValue(undefined);
    service.reserveInventory.mockResolvedValue({
      movement: { id: 'movement-1' },
    } as never);
    service.releaseInventory.mockResolvedValue({
      movement: { id: 'movement-2' },
    } as never);
    service.consumeInventory.mockResolvedValue({
      movement: { id: 'movement-3' },
    } as never);
    service.sellInventory.mockResolvedValue({
      movement: { id: 'movement-4' },
    } as never);
    service.createPayment.mockResolvedValue({ id: 'payment-1' } as never);
    service.findPayments.mockResolvedValue({ data: [] } as never);
    service.updatePayment.mockResolvedValue({ id: 'payment-1' } as never);
    service.removePayment.mockResolvedValue(undefined as never);

    await expect(controller.create(createDto)).resolves.toEqual({ id: 'wo-1' });
    await expect(controller.findAll(listDto)).resolves.toEqual({
      data: [],
      meta: {},
    });
    await expect(controller.findOne('wo-1')).resolves.toEqual({ id: 'wo-1' });
    await expect(controller.update('wo-1', updateDto)).resolves.toEqual({
      id: 'wo-1',
    });
    await expect(
      controller.upsertEstimate('wo-1', 'INITIAL', estimateDto),
    ).resolves.toEqual({ id: 'estimate-1' });
    await expect(controller.findEstimates('wo-1')).resolves.toEqual({
      data: [],
    });
    await expect(
      controller.createActualCost('wo-1', createCostDto),
    ).resolves.toEqual({ id: 'cost-1' });
    await expect(controller.findActualCosts('wo-1')).resolves.toEqual({
      data: [],
    });
    await expect(
      controller.updateActualCost('wo-1', 'cost-1', updateCostDto),
    ).resolves.toEqual({ id: 'cost-1' });
    await expect(
      controller.removeActualCost('wo-1', 'cost-1'),
    ).resolves.toBeUndefined();
    await expect(
      controller.reserveInventory('wo-1', reserveInventoryDto),
    ).resolves.toEqual({ movement: { id: 'movement-1' } });
    await expect(
      controller.releaseInventory('wo-1', releaseInventoryDto),
    ).resolves.toEqual({ movement: { id: 'movement-2' } });
    await expect(
      controller.consumeInventory('wo-1', consumeInventoryDto),
    ).resolves.toEqual({ movement: { id: 'movement-3' } });
    await expect(
      controller.sellInventory('wo-1', sellInventoryDto),
    ).resolves.toEqual({ movement: { id: 'movement-4' } });
    await expect(
      controller.createPayment('wo-1', createPaymentDto),
    ).resolves.toEqual({ id: 'payment-1' });
    await expect(controller.findPayments('wo-1')).resolves.toEqual({
      data: [],
    });
    await expect(
      controller.updatePayment('wo-1', 'payment-1', updatePaymentDto),
    ).resolves.toEqual({ id: 'payment-1' });
    await expect(
      controller.removePayment('wo-1', 'payment-1'),
    ).resolves.toBeUndefined();

    expect(Reflect.getMetadata(PATH_METADATA, WorkOrdersController)).toBe(
      'work-orders',
    );
    expect(Reflect.getMetadata(ROLES_KEY, WorkOrdersController)).toEqual([
      'ADMIN',
      'SALES',
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, WorkOrdersController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);

    const handlers = {
      create: getControllerMethod('create'),
      findAll: getControllerMethod('findAll'),
      findOne: getControllerMethod('findOne'),
      update: getControllerMethod('update'),
      upsertEstimate: getControllerMethod('upsertEstimate'),
      findEstimates: getControllerMethod('findEstimates'),
      createActualCost: getControllerMethod('createActualCost'),
      findActualCosts: getControllerMethod('findActualCosts'),
      updateActualCost: getControllerMethod('updateActualCost'),
      removeActualCost: getControllerMethod('removeActualCost'),
      reserveInventory: getControllerMethod('reserveInventory'),
      releaseInventory: getControllerMethod('releaseInventory'),
      consumeInventory: getControllerMethod('consumeInventory'),
      sellInventory: getControllerMethod('sellInventory'),
      createPayment: getControllerMethod('createPayment'),
      findPayments: getControllerMethod('findPayments'),
      updatePayment: getControllerMethod('updatePayment'),
      removePayment: getControllerMethod('removePayment'),
    };

    expect(Reflect.getMetadata(PATH_METADATA, handlers.create)).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, handlers.create)).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handlers.findAll)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handlers.findOne)).toBe(':id');
    expect(Reflect.getMetadata(METHOD_METADATA, handlers.findOne)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handlers.update)).toBe(':id');
    expect(Reflect.getMetadata(METHOD_METADATA, handlers.update)).toBe(
      RequestMethod.PATCH,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handlers.upsertEstimate)).toBe(
      ':id/estimates/:phase',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handlers.upsertEstimate)).toBe(
      RequestMethod.PUT,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handlers.findEstimates)).toBe(
      ':id/estimates',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handlers.findEstimates)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handlers.createActualCost)).toBe(
      ':id/actual-costs',
    );
    expect(
      Reflect.getMetadata(METHOD_METADATA, handlers.createActualCost),
    ).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, handlers.findActualCosts)).toBe(
      ':id/actual-costs',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handlers.findActualCosts)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handlers.updateActualCost)).toBe(
      ':id/actual-costs/:costId',
    );
    expect(
      Reflect.getMetadata(METHOD_METADATA, handlers.updateActualCost),
    ).toBe(RequestMethod.PATCH);
    expect(Reflect.getMetadata(PATH_METADATA, handlers.removeActualCost)).toBe(
      ':id/actual-costs/:costId',
    );
    expect(
      Reflect.getMetadata(METHOD_METADATA, handlers.removeActualCost),
    ).toBe(RequestMethod.DELETE);
    expect(Reflect.getMetadata(PATH_METADATA, handlers.reserveInventory)).toBe(
      ':id/inventory/reservations',
    );
    expect(
      Reflect.getMetadata(METHOD_METADATA, handlers.reserveInventory),
    ).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, handlers.releaseInventory)).toBe(
      ':id/inventory/releases',
    );
    expect(
      Reflect.getMetadata(METHOD_METADATA, handlers.releaseInventory),
    ).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, handlers.consumeInventory)).toBe(
      ':id/inventory/consumptions',
    );
    expect(
      Reflect.getMetadata(METHOD_METADATA, handlers.consumeInventory),
    ).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, handlers.sellInventory)).toBe(
      ':id/inventory/sales',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handlers.sellInventory)).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handlers.createPayment)).toBe(
      ':id/payments',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handlers.createPayment)).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handlers.findPayments)).toBe(
      ':id/payments',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handlers.findPayments)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handlers.updatePayment)).toBe(
      ':id/payments/:paymentId',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handlers.updatePayment)).toBe(
      RequestMethod.PATCH,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handlers.removePayment)).toBe(
      ':id/payments/:paymentId',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handlers.removePayment)).toBe(
      RequestMethod.DELETE,
    );

    expect(service.create.mock.calls[0]).toEqual([createDto]);
    expect(service.findAll.mock.calls[0]).toEqual([listDto]);
    expect(service.findOne.mock.calls[0]).toEqual(['wo-1']);
    expect(service.update.mock.calls[0]).toEqual(['wo-1', updateDto]);
    expect(service.upsertEstimate.mock.calls[0]).toEqual([
      'wo-1',
      'INITIAL',
      estimateDto,
    ]);
    expect(service.findEstimates.mock.calls[0]).toEqual(['wo-1']);
    expect(service.createActualCost.mock.calls[0]).toEqual([
      'wo-1',
      createCostDto,
    ]);
    expect(service.findActualCosts.mock.calls[0]).toEqual(['wo-1']);
    expect(service.updateActualCost.mock.calls[0]).toEqual([
      'wo-1',
      'cost-1',
      updateCostDto,
    ]);
    expect(service.removeActualCost.mock.calls[0]).toEqual(['wo-1', 'cost-1']);
    expect(service.reserveInventory.mock.calls[0]).toEqual([
      'wo-1',
      reserveInventoryDto,
    ]);
    expect(service.releaseInventory.mock.calls[0]).toEqual([
      'wo-1',
      releaseInventoryDto,
    ]);
    expect(service.consumeInventory.mock.calls[0]).toEqual([
      'wo-1',
      consumeInventoryDto,
    ]);
    expect(service.sellInventory.mock.calls[0]).toEqual([
      'wo-1',
      sellInventoryDto,
    ]);
    expect(service.createPayment.mock.calls[0]).toEqual([
      'wo-1',
      createPaymentDto,
    ]);
    expect(service.findPayments.mock.calls[0]).toEqual(['wo-1']);
    expect(service.updatePayment.mock.calls[0]).toEqual([
      'wo-1',
      'payment-1',
      updatePaymentDto,
    ]);
    expect(service.removePayment.mock.calls[0]).toEqual(['wo-1', 'payment-1']);

    const appModuleImports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    ) as unknown[];

    expect(appModuleImports).toContain(WorkOrdersModule);
  });
});
