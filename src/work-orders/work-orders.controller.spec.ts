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
    const createPaymentDto = {} as CreateWorkOrderPaymentDto;
    const updatePaymentDto = {} as UpdateWorkOrderPaymentDto;

    service.create.mockResolvedValue({ id: 'wo-1' } as never);
    service.findAll.mockResolvedValue({ data: [], meta: {} } as never);
    service.findOne.mockResolvedValue({ id: 'wo-1' } as never);
    service.update.mockResolvedValue({ id: 'wo-1' } as never);
    service.upsertEstimate.mockResolvedValue({ id: 'estimate-1' } as never);
    service.findEstimates.mockResolvedValue({ data: [] } as never);
    service.createActualCost.mockResolvedValue({ id: 'cost-1' } as never);
    service.findActualCosts.mockResolvedValue({ data: [] } as never);
    service.updateActualCost.mockResolvedValue({ id: 'cost-1' } as never);
    service.removeActualCost.mockResolvedValue(undefined as never);
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
      create: Object.getOwnPropertyDescriptor(WorkOrdersController.prototype, 'create')?.value,
      findAll: Object.getOwnPropertyDescriptor(WorkOrdersController.prototype, 'findAll')?.value,
      findOne: Object.getOwnPropertyDescriptor(WorkOrdersController.prototype, 'findOne')?.value,
      update: Object.getOwnPropertyDescriptor(WorkOrdersController.prototype, 'update')?.value,
      upsertEstimate: Object.getOwnPropertyDescriptor(WorkOrdersController.prototype, 'upsertEstimate')?.value,
      findEstimates: Object.getOwnPropertyDescriptor(WorkOrdersController.prototype, 'findEstimates')?.value,
      createActualCost: Object.getOwnPropertyDescriptor(WorkOrdersController.prototype, 'createActualCost')?.value,
      findActualCosts: Object.getOwnPropertyDescriptor(WorkOrdersController.prototype, 'findActualCosts')?.value,
      updateActualCost: Object.getOwnPropertyDescriptor(WorkOrdersController.prototype, 'updateActualCost')?.value,
      removeActualCost: Object.getOwnPropertyDescriptor(WorkOrdersController.prototype, 'removeActualCost')?.value,
      createPayment: Object.getOwnPropertyDescriptor(WorkOrdersController.prototype, 'createPayment')?.value,
      findPayments: Object.getOwnPropertyDescriptor(WorkOrdersController.prototype, 'findPayments')?.value,
      updatePayment: Object.getOwnPropertyDescriptor(WorkOrdersController.prototype, 'updatePayment')?.value,
      removePayment: Object.getOwnPropertyDescriptor(WorkOrdersController.prototype, 'removePayment')?.value,
    };

    expect(Reflect.getMetadata(PATH_METADATA, handlers.create as object)).toBe(
      '/'
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handlers.create as object)).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handlers.findAll as object)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handlers.findOne as object)).toBe(
      ':id',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handlers.findOne as object)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handlers.update as object)).toBe(
      ':id',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handlers.update as object)).toBe(
      RequestMethod.PATCH,
    );
    expect(
      Reflect.getMetadata(PATH_METADATA, handlers.upsertEstimate as object),
    ).toBe(':id/estimates/:phase');
    expect(
      Reflect.getMetadata(METHOD_METADATA, handlers.upsertEstimate as object),
    ).toBe(RequestMethod.PUT);
    expect(
      Reflect.getMetadata(PATH_METADATA, handlers.findEstimates as object),
    ).toBe(':id/estimates');
    expect(
      Reflect.getMetadata(METHOD_METADATA, handlers.findEstimates as object),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(PATH_METADATA, handlers.createActualCost as object),
    ).toBe(':id/actual-costs');
    expect(
      Reflect.getMetadata(METHOD_METADATA, handlers.createActualCost as object),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(PATH_METADATA, handlers.findActualCosts as object),
    ).toBe(':id/actual-costs');
    expect(
      Reflect.getMetadata(METHOD_METADATA, handlers.findActualCosts as object),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(PATH_METADATA, handlers.updateActualCost as object),
    ).toBe(':id/actual-costs/:costId');
    expect(
      Reflect.getMetadata(METHOD_METADATA, handlers.updateActualCost as object),
    ).toBe(RequestMethod.PATCH);
    expect(
      Reflect.getMetadata(PATH_METADATA, handlers.removeActualCost as object),
    ).toBe(':id/actual-costs/:costId');
    expect(
      Reflect.getMetadata(METHOD_METADATA, handlers.removeActualCost as object),
    ).toBe(RequestMethod.DELETE);
    expect(
      Reflect.getMetadata(PATH_METADATA, handlers.createPayment as object),
    ).toBe(':id/payments');
    expect(
      Reflect.getMetadata(METHOD_METADATA, handlers.createPayment as object),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(PATH_METADATA, handlers.findPayments as object),
    ).toBe(':id/payments');
    expect(
      Reflect.getMetadata(METHOD_METADATA, handlers.findPayments as object),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(PATH_METADATA, handlers.updatePayment as object),
    ).toBe(':id/payments/:paymentId');
    expect(
      Reflect.getMetadata(METHOD_METADATA, handlers.updatePayment as object),
    ).toBe(RequestMethod.PATCH);
    expect(
      Reflect.getMetadata(PATH_METADATA, handlers.removePayment as object),
    ).toBe(':id/payments/:paymentId');
    expect(
      Reflect.getMetadata(METHOD_METADATA, handlers.removePayment as object),
    ).toBe(RequestMethod.DELETE);

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
    expect(service.createActualCost.mock.calls[0]).toEqual(['wo-1', createCostDto]);
    expect(service.findActualCosts.mock.calls[0]).toEqual(['wo-1']);
    expect(service.updateActualCost.mock.calls[0]).toEqual([
      'wo-1',
      'cost-1',
      updateCostDto,
    ]);
    expect(service.removeActualCost.mock.calls[0]).toEqual(['wo-1', 'cost-1']);
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
    expect(service.removePayment.mock.calls[0]).toEqual([
      'wo-1',
      'payment-1',
    ]);

    const appModuleImports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    ) as unknown[];

    expect(appModuleImports).toContain(WorkOrdersModule);
  });
});
