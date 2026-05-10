import { PaymentMethod, PaymentStatus, WorkOrderStatus, WorkOrderType } from '../../../generated/prisma/enums';
import { CreateWorkOrderPaymentDto } from '../dto/create-work-order-payment.dto';
import { UpdateWorkOrderPaymentDto } from '../dto/update-work-order-payment.dto';
import { WorkOrdersRepository } from '../persistence/work-orders.repository';
import { WorkOrderPaymentsService } from './work-order-payments.service';
import { WorkOrderReadModelService } from './work-order-read-model.service';

describe('WorkOrderPaymentsService', () => {
  const payment = {
    id: 'payment-1',
    amount: 50000,
    paymentMethod: PaymentMethod.CASH,
    paidAt: new Date('2026-05-10T20:00:00.000Z'),
    notes: 'Abono inicial',
  };

  const workOrder = {
    id: 'wo-1',
    number: 1001,
    type: WorkOrderType.WORKSHOP,
    status: WorkOrderStatus.IN_PROGRESS,
    paymentStatus: PaymentStatus.PENDING,
    customerId: 'customer-1',
    vehicleId: null,
    componentId: null,
    assignedEmployeeId: null,
    summary: 'Diagnóstico',
    externalLink: null,
    notes: null,
    estimatedCompletionAt: null,
    estimatedCollectionAt: null,
    completedAt: null,
    createdAt: new Date('2026-05-10T20:00:00.000Z'),
    updatedAt: new Date('2026-05-10T20:00:00.000Z'),
    customer: { id: 'customer-1', name: 'Cliente Uno' },
    vehicle: null,
    component: null,
    assignedEmployee: null,
    workshopDetails: null,
    estimates: [
      {
        id: 'estimate-final-1',
        phase: 'FINAL',
        totalCostAmount: 60000,
        totalPriceAmount: 100000,
        notes: null,
      },
    ],
    actualCosts: [],
    payments: [payment],
  };

  const repository = {
    createPayment: jest.fn(),
    updatePayment: jest.fn(),
    removePayment: jest.fn(),
  } as unknown as jest.Mocked<WorkOrdersRepository>;

  const readModelService = {
    findOne: jest.fn(),
  } as unknown as jest.Mocked<WorkOrderReadModelService>;

  let service: WorkOrderPaymentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkOrderPaymentsService(repository, readModelService);
  });

  it('creates a payment and recalculates payment status from the current work-order totals', async () => {
    const dto: CreateWorkOrderPaymentDto = {
      amount: 50000,
      paidAt: new Date('2026-05-10T20:00:00.000Z'),
      paymentMethod: PaymentMethod.CASH,
      notes: 'Abono inicial',
    };
    readModelService.findOne.mockResolvedValue(workOrder);
    repository.createPayment.mockResolvedValue({
      ...workOrder,
      paymentStatus: PaymentStatus.PARTIAL,
    });

    await expect(service.createPayment('wo-1', dto)).resolves.toMatchObject({
      id: 'wo-1',
      paymentStatus: PaymentStatus.PARTIAL,
    });

    expect(readModelService.findOne).toHaveBeenCalledWith('wo-1');
    expect(repository.createPayment).toHaveBeenCalledWith('wo-1', dto, workOrder);
  });

  it('lists payments from the current work-order read model', async () => {
    readModelService.findOne.mockResolvedValue(workOrder);

    await expect(service.findPayments('wo-1')).resolves.toEqual([payment]);

    expect(readModelService.findOne).toHaveBeenCalledWith('wo-1');
  });

  it('updates a payment and recalculates payment status from the preferred payable total', async () => {
    const dto: UpdateWorkOrderPaymentDto = {
      amount: 100000,
      paymentMethod: PaymentMethod.TRANSFER,
    };
    readModelService.findOne.mockResolvedValue(workOrder);
    repository.updatePayment.mockResolvedValue({
      ...workOrder,
      paymentStatus: PaymentStatus.PAID,
      payments: [
        {
          ...payment,
          amount: 100000,
          paymentMethod: PaymentMethod.TRANSFER,
        },
      ],
    });

    await expect(service.updatePayment('wo-1', 'payment-1', dto)).resolves.toMatchObject({
      id: 'wo-1',
      paymentStatus: PaymentStatus.PAID,
    });

    expect(readModelService.findOne).toHaveBeenCalledWith('wo-1');
    expect(repository.updatePayment).toHaveBeenCalledWith(
      'wo-1',
      'payment-1',
      dto,
      workOrder,
    );
  });

  it('removes a payment and preserves manual payment status when no payable total exists', async () => {
    const manualStatusWorkOrder = {
      ...workOrder,
      paymentStatus: PaymentStatus.PAID,
      estimates: [],
    };
    readModelService.findOne.mockResolvedValue(manualStatusWorkOrder);
    repository.removePayment.mockResolvedValue({
      ...manualStatusWorkOrder,
      payments: [],
    });

    await expect(service.removePayment('wo-1', 'payment-1')).resolves.toMatchObject({
      id: 'wo-1',
      paymentStatus: PaymentStatus.PAID,
      payments: [],
    });

    expect(readModelService.findOne).toHaveBeenCalledWith('wo-1');
    expect(repository.removePayment).toHaveBeenCalledWith(
      'wo-1',
      'payment-1',
      manualStatusWorkOrder,
    );
  });
});
