import {
  PaymentStatus,
  WorkOrderStatus,
  WorkOrderType,
} from '../../../generated/prisma/enums';
import { WorkOrdersRepository } from '../persistence/work-orders.repository';
import { WorkOrderLifecycleService } from './work-order-lifecycle.service';
import { WorkOrderReadModelService } from './work-order-read-model.service';
import { WorkOrderRelationsService } from './work-order-relations.service';

describe('WorkOrderLifecycleService', () => {
  const logger = {
    log: jest.fn(),
  };

  const workOrder = {
    id: 'wo-1',
    number: 1001,
    type: WorkOrderType.SALE,
    status: WorkOrderStatus.IN_PROGRESS,
    paymentStatus: PaymentStatus.PENDING,
    customerId: 'customer-1',
    vehicleId: null,
    componentId: null,
    assignedEmployeeId: null,
    summary: 'Venta de repuesto',
    externalLink: 'https://example.com/orders/1001',
    notes: 'Cliente espera hoy',
    estimatedCompletionAt: null,
    estimatedCollectionAt: new Date('2026-05-12T17:00:00.000Z'),
    completedAt: null,
    createdAt: new Date('2026-05-10T20:00:00.000Z'),
    updatedAt: new Date('2026-05-10T20:00:00.000Z'),
    customer: {
      id: 'customer-1',
      name: 'Cliente Uno',
      phone: '3000000000',
      documentType: 'CEDULA',
      documentNumber: '123',
      email: 'cliente@example.com',
    },
    vehicle: null,
    component: null,
    assignedEmployee: null,
    workshopDetails: null,
    estimates: [],
    actualCosts: [],
    payments: [],
  };

  const repository = {
    create: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<WorkOrdersRepository>;

  const relationsService = {
    assertCreateRelations: jest.fn(),
    assertUpdateRelations: jest.fn(),
  } as unknown as jest.Mocked<WorkOrderRelationsService>;

  const readModelService = {
    findMany: jest.fn(),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<WorkOrderReadModelService>;

  let service: WorkOrderLifecycleService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkOrderLifecycleService(
      repository,
      relationsService,
      readModelService,
    );
    Object.defineProperty(service, 'logger', {
      value: logger,
      writable: true,
    });
  });

  it('creates a sale work order with default statuses and empty financial collections', async () => {
    relationsService.assertCreateRelations.mockResolvedValue({
      customer: workOrder.customer,
      vehicle: null,
      component: null,
      assignedEmployee: null,
    });
    repository.create.mockResolvedValue(workOrder);

    await expect(
      service.create({
        type: WorkOrderType.SALE,
        customerId: 'customer-1',
        summary: ' Venta de repuesto ',
        externalLink: ' https://example.com/orders/1001 ',
        notes: ' Cliente espera hoy ',
        estimatedCollectionAt: new Date('2026-05-12T17:00:00.000Z'),
      }),
    ).resolves.toEqual(workOrder);

    expect(relationsService.assertCreateRelations).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WorkOrderType.SALE,
        customerId: 'customer-1',
        summary: ' Venta de repuesto ',
      }),
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WorkOrderType.SALE,
        customerId: 'customer-1',
      }),
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('workOrderId=wo-1'),
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining(`type=${WorkOrderType.SALE}`),
    );
    expect(logger.log).not.toHaveBeenCalledWith(
      expect.stringContaining('Cliente espera hoy'),
    );
  });

  it('lists work orders through the read model service', async () => {
    readModelService.findMany.mockResolvedValue({
      data: [workOrder],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await expect(
      service.findAll({
        page: 1,
        limit: 10,
        type: WorkOrderType.SALE,
        search: '1001',
      }),
    ).resolves.toEqual({
      data: [workOrder],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
  });

  it('finds one work order through the read model service', async () => {
    readModelService.findOne.mockResolvedValue(workOrder);

    await expect(service.findOne('wo-1')).resolves.toEqual(workOrder);
  });

  it('updates an existing work order after validating merged relations', async () => {
    readModelService.findOne.mockResolvedValue(workOrder);
    relationsService.assertUpdateRelations.mockResolvedValue({
      customer: workOrder.customer,
      vehicle: null,
      component: null,
      assignedEmployee: null,
    });
    repository.update.mockResolvedValue({
      ...workOrder,
      status: WorkOrderStatus.COMPLETED,
      completedAt: new Date('2026-05-12T18:00:00.000Z'),
    });

    await expect(
      service.update('wo-1', {
        status: WorkOrderStatus.COMPLETED,
        completedAt: new Date('2026-05-12T18:00:00.000Z'),
      }),
    ).resolves.toMatchObject({
      id: 'wo-1',
      status: WorkOrderStatus.COMPLETED,
    });

    expect(relationsService.assertUpdateRelations).toHaveBeenCalledWith(
      workOrder,
      expect.objectContaining({ status: WorkOrderStatus.COMPLETED }),
    );
    expect(repository.update).toHaveBeenCalledWith(
      'wo-1',
      expect.objectContaining({ status: WorkOrderStatus.COMPLETED }),
      WorkOrderType.SALE,
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('status=COMPLETED'),
    );
    expect(logger.log).not.toHaveBeenCalledWith(
      expect.stringContaining('Cliente espera hoy'),
    );
  });

  it('cancels a work order through update instead of any hard-delete path', async () => {
    readModelService.findOne.mockResolvedValue({
      ...workOrder,
      type: WorkOrderType.WORKSHOP,
      vehicleId: 'vehicle-1',
      componentId: 'component-1',
    });
    relationsService.assertUpdateRelations.mockResolvedValue({
      customer: workOrder.customer,
      vehicle: { id: 'vehicle-1' },
      component: { id: 'component-1' },
      assignedEmployee: null,
    });
    repository.update.mockResolvedValue({
      ...workOrder,
      type: WorkOrderType.WORKSHOP,
      status: WorkOrderStatus.CANCELLED,
      vehicleId: 'vehicle-1',
      componentId: 'component-1',
    });

    await expect(
      service.update('wo-1', { status: WorkOrderStatus.CANCELLED }),
    ).resolves.toMatchObject({
      id: 'wo-1',
      status: WorkOrderStatus.CANCELLED,
    });

    expect(repository.update).toHaveBeenCalledTimes(1);
  });
});
