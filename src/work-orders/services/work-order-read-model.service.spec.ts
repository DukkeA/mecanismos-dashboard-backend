import { NotFoundException } from '@nestjs/common';
import {
  PaymentStatus,
  WorkOrderStatus,
  WorkOrderType,
} from '../../../generated/prisma/enums';
import { WorkOrdersRepository } from '../persistence/work-orders.repository';
import { WorkOrderReadModelService } from './work-order-read-model.service';

describe('WorkOrderReadModelService', () => {
  const workOrder = {
    id: 'wo-1',
    number: 1024,
    type: WorkOrderType.SALE,
    status: WorkOrderStatus.IN_PROGRESS,
    paymentStatus: PaymentStatus.PENDING,
    customerId: 'customer-1',
    vehicleId: null,
    componentId: null,
    assignedEmployeeId: null,
    summary: 'Venta de repuesto',
    externalLink: null,
    notes: null,
    estimatedCompletionAt: null,
    estimatedCollectionAt: null,
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
    findMany: jest.fn(),
    findById: jest.fn(),
  } as unknown as jest.Mocked<WorkOrdersRepository>;

  let service: WorkOrderReadModelService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkOrderReadModelService(repository);
  });

  it('returns paginated work orders with stable metadata', async () => {
    repository.findMany.mockResolvedValue({
      items: [workOrder],
      total: 3,
      page: 2,
      limit: 1,
    });

    await expect(
      service.findMany({
        page: 2,
        limit: 1,
        status: WorkOrderStatus.IN_PROGRESS,
        customerId: 'customer-1',
      }),
    ).resolves.toEqual({
      data: [workOrder],
      meta: {
        page: 2,
        limit: 1,
        total: 3,
        totalPages: 3,
      },
    });
  });

  it('returns one work order with related summaries and empty financial collections', async () => {
    repository.findById.mockResolvedValue(workOrder);

    await expect(service.findOne('wo-1')).resolves.toEqual(workOrder);
  });

  it('throws NotFoundException when the work order does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('missing-work-order')).rejects.toThrow(
      new NotFoundException('Work order missing-work-order not found'),
    );
  });
});
