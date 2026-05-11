import {
  EstimatePhase,
  PaymentStatus,
  WorkOrderStatus,
} from '../../../../generated/prisma/enums';
import type { WorkOrderFinancialReadModel } from '../../persistence/operations-reporting.repository';
import { OperationsReportingRepository } from '../../persistence/operations-reporting.repository';
import { PendingPaymentsReportService } from './pending-payments-report.service';

describe('PendingPaymentsReportService', () => {
  const findWorkOrdersWithFinancialsMock = jest.fn();
  const repository = {
    findWorkOrdersWithFinancials: findWorkOrdersWithFinancialsMock,
  } as unknown as jest.Mocked<OperationsReportingRepository>;

  const loggerLogMock = jest.fn();
  const loggerErrorMock = jest.fn();
  const logger = {
    log: loggerLogMock,
    error: loggerErrorMock,
  };

  let service: PendingPaymentsReportService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PendingPaymentsReportService(repository);
    Object.defineProperty(service, 'logger', {
      value: logger,
      writable: true,
    });
  });

  it('returns only pending or partial receivables with explicit overpaid handling', async () => {
    const query = {
      dateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dateTo: new Date('2026-05-31T23:59:59.000Z'),
      customerId: 'customer-1',
    };

    findWorkOrdersWithFinancialsMock.mockResolvedValue([
      buildWorkOrderRow({
        id: 'wo-partial',
        number: 1001,
        paymentStatus: PaymentStatus.PARTIAL,
        payableAmount: 100_000,
        payments: [40_000],
        vehicle: { brand: 'Mazda', modelReference: 'BT-50', plate: 'ABC123' },
      }),
      buildWorkOrderRow({
        id: 'wo-overpaid',
        number: 1002,
        paymentStatus: PaymentStatus.PARTIAL,
        payableAmount: 80_000,
        payments: [100_000],
        component: {
          brand: 'Bosch',
          reference: 'ALT-90A',
          identifier: 'SER-100',
        },
      }),
      buildWorkOrderRow({
        id: 'wo-paid',
        number: 1003,
        paymentStatus: PaymentStatus.PAID,
        payableAmount: 90_000,
        payments: [90_000],
      }),
    ]);

    await expect(service.getReport(query)).resolves.toEqual({
      approximate: true,
      basis: 'cash-operational',
      window: {
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-05-31T23:59:59.000Z',
      },
      data: [
        {
          workOrderId: 'wo-partial',
          customerId: 'customer-1',
          customerName: 'Cliente Uno',
          assetLabel: 'Mazda BT-50 · ABC123',
          status: WorkOrderStatus.IN_PROGRESS,
          paymentStatus: PaymentStatus.PARTIAL,
          payableAmount: 100_000,
          paidTotal: 40_000,
          balance: 60_000,
          overpaid: false,
        },
        {
          workOrderId: 'wo-overpaid',
          customerId: 'customer-1',
          customerName: 'Cliente Uno',
          assetLabel: 'Bosch ALT-90A · SER-100',
          status: WorkOrderStatus.IN_PROGRESS,
          paymentStatus: PaymentStatus.PARTIAL,
          payableAmount: 80_000,
          paidTotal: 100_000,
          balance: 0,
          overpaid: true,
        },
      ],
    });

    expect(findWorkOrdersWithFinancialsMock).toHaveBeenCalledWith(query);
    expect(loggerLogMock).toHaveBeenCalledWith(
      expect.stringContaining('report=pending-payments'),
    );
  });

  it('keeps balance null when a pending row has no known payable amount', async () => {
    findWorkOrdersWithFinancialsMock.mockResolvedValue([
      buildWorkOrderRow({
        id: 'wo-unknown',
        number: 1004,
        paymentStatus: PaymentStatus.PENDING,
        payableAmount: null,
        payments: [30_000],
      }),
    ]);

    await expect(service.getReport({})).resolves.toMatchObject({
      data: [
        {
          workOrderId: 'wo-unknown',
          payableAmount: null,
          paidTotal: 30_000,
          balance: null,
          overpaid: false,
        },
      ],
    });
  });
});

function buildWorkOrderRow({
  id,
  number,
  paymentStatus,
  payableAmount,
  payments,
  vehicle,
  component,
}: {
  id: string;
  number: number;
  paymentStatus: PaymentStatus;
  payableAmount: number | null;
  payments: number[];
  vehicle?: { brand: string; modelReference: string; plate: string };
  component?: { brand: string; reference: string; identifier: string | null };
}): WorkOrderFinancialReadModel {
  return {
    id,
    number,
    createdAt: new Date('2026-05-10T10:00:00.000Z'),
    status: WorkOrderStatus.IN_PROGRESS,
    paymentStatus,
    customerId: 'customer-1',
    assignedEmployeeId: null,
    Customer: { id: 'customer-1', name: 'Cliente Uno' },
    Vehicle: vehicle
      ? {
          id: `${id}-vehicle`,
          brand: vehicle.brand,
          modelReference: vehicle.modelReference,
          plate: vehicle.plate,
        }
      : null,
    Component: component
      ? {
          id: `${id}-component`,
          brand: component.brand,
          reference: component.reference,
          identifier: component.identifier,
        }
      : null,
    Employee: null,
    WorkOrderEstimate:
      payableAmount === null
        ? []
        : [{ phase: EstimatePhase.FINAL, totalPriceAmount: payableAmount }],
    WorkOrderPayment: payments.map((amount, index) => ({
      id: `${id}-payment-${index + 1}`,
      amount,
      paidAt: new Date(`2026-05-${10 + index}T10:00:00.000Z`),
    })),
    WorkOrderActualCost: [],
  };
}
