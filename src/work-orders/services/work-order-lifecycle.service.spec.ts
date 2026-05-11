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
  const loggerLogMock = jest.fn();
  const logger = {
    log: loggerLogMock,
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

  const createMock = jest.fn();
  const updateMock = jest.fn();
  const repository = {
    create: createMock,
    update: updateMock,
  } as unknown as jest.Mocked<WorkOrdersRepository>;

  const assertCreateRelationsMock = jest.fn();
  const assertUpdateRelationsMock = jest.fn();
  const relationsService = {
    assertCreateRelations: assertCreateRelationsMock,
    assertUpdateRelations: assertUpdateRelationsMock,
  } as unknown as jest.Mocked<WorkOrderRelationsService>;

  const findManyMock = jest.fn();
  const findOneMock = jest.fn();
  const readModelService = {
    findMany: findManyMock,
    findOne: findOneMock,
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
    assertCreateRelationsMock.mockResolvedValue({
      customer: workOrder.customer,
      vehicle: null,
      component: null,
      assignedEmployee: null,
    });
    createMock.mockResolvedValue(workOrder);

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

    expect(assertCreateRelationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WorkOrderType.SALE,
        customerId: 'customer-1',
        summary: ' Venta de repuesto ',
      }),
    );
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WorkOrderType.SALE,
        customerId: 'customer-1',
      }),
    );
    expect(loggerLogMock).toHaveBeenCalledWith(
      expect.stringContaining('workOrderId=wo-1'),
    );
    expect(loggerLogMock).toHaveBeenCalledWith(
      expect.stringContaining(`type=${WorkOrderType.SALE}`),
    );
    expect(loggerLogMock).not.toHaveBeenCalledWith(
      expect.stringContaining('Cliente espera hoy'),
    );
  });

  it('lists work orders through the read model service', async () => {
    findManyMock.mockResolvedValue({
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
    findOneMock.mockResolvedValue(workOrder);

    await expect(service.findOne('wo-1')).resolves.toEqual(workOrder);
  });

  it('updates an existing work order after validating merged relations', async () => {
    findOneMock.mockResolvedValue(workOrder);
    assertUpdateRelationsMock.mockResolvedValue({
      customer: workOrder.customer,
      vehicle: null,
      component: null,
      assignedEmployee: null,
    });
    updateMock.mockResolvedValue({
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

    expect(assertUpdateRelationsMock).toHaveBeenCalledWith(
      workOrder,
      expect.objectContaining({ status: WorkOrderStatus.COMPLETED }),
    );
    expect(updateMock).toHaveBeenCalledWith(
      'wo-1',
      expect.objectContaining({ status: WorkOrderStatus.COMPLETED }),
      WorkOrderType.SALE,
    );
    expect(loggerLogMock).toHaveBeenCalledWith(
      expect.stringContaining('status=COMPLETED'),
    );
    expect(loggerLogMock).not.toHaveBeenCalledWith(
      expect.stringContaining('Cliente espera hoy'),
    );
  });

  it('cancels a work order through update instead of any hard-delete path', async () => {
    findOneMock.mockResolvedValue({
      ...workOrder,
      type: WorkOrderType.WORKSHOP,
      vehicleId: 'vehicle-1',
      componentId: 'component-1',
    });
    assertUpdateRelationsMock.mockResolvedValue({
      customer: workOrder.customer,
      vehicle: { id: 'vehicle-1', customerId: 'customer-1' },
      component: { id: 'component-1', customerId: 'customer-1' },
      assignedEmployee: null,
    });
    updateMock.mockResolvedValue({
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

    expect(updateMock).toHaveBeenCalledTimes(1);
  });
});
