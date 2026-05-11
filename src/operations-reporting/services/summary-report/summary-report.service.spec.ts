import {
  EstimatePhase,
  ExpenseCategory,
  PaymentStatus,
  WorkOrderStatus,
} from '../../../../generated/prisma/enums';
import type {
  ExpenseReadModel,
  SummaryWorkOrderReadModel,
  WorkOrderFinancialReadModel,
} from '../../persistence/operations-reporting.repository';
import { OperationsReportingRepository } from '../../persistence/operations-reporting.repository';
import { SummaryReportService } from './summary-report.service';

describe('SummaryReportService', () => {
  const repository = {
    findSummaryWorkOrders: jest.fn(),
    findWorkOrdersWithFinancials: jest.fn(),
    findPaidExpenses: jest.fn(),
    findPendingExpenses: jest.fn(),
  } as unknown as jest.Mocked<OperationsReportingRepository>;

  const logger = {
    log: jest.fn(),
    error: jest.fn(),
  };

  let service: SummaryReportService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SummaryReportService(repository);
    Object.defineProperty(service, 'logger', {
      value: logger,
      writable: true,
    });
  });

  it('builds summary buckets and approximate utility from metric-specific sources', async () => {
    const query = {
      dateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dateTo: new Date('2026-05-31T23:59:59.000Z'),
    };

    repository.findSummaryWorkOrders.mockResolvedValue([
      buildSummaryWorkOrder(
        'wo-1',
        WorkOrderStatus.IN_PROGRESS,
        PaymentStatus.PENDING,
      ),
      buildSummaryWorkOrder(
        'wo-2',
        WorkOrderStatus.PAUSED,
        PaymentStatus.PARTIAL,
      ),
      buildSummaryWorkOrder(
        'wo-3',
        WorkOrderStatus.COMPLETED,
        PaymentStatus.PAID,
      ),
      buildSummaryWorkOrder(
        'wo-4',
        WorkOrderStatus.CANCELLED,
        PaymentStatus.PARTIAL,
      ),
    ]);
    repository.findWorkOrdersWithFinancials.mockResolvedValue([
      buildFinancialWorkOrder({
        id: 'wo-1',
        paymentStatus: PaymentStatus.PENDING,
        payableAmount: 100_000,
        payments: [40_000],
        actualCosts: [25_000],
      }),
      buildFinancialWorkOrder({
        id: 'wo-2',
        status: WorkOrderStatus.PAUSED,
        paymentStatus: PaymentStatus.PARTIAL,
        payableAmount: 80_000,
        payments: [100_000],
        actualCosts: [15_000],
      }),
      buildFinancialWorkOrder({
        id: 'wo-3',
        status: WorkOrderStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
        payableAmount: 90_000,
        payments: [90_000],
        actualCosts: [30_000],
      }),
    ]);
    repository.findPaidExpenses.mockResolvedValue([
      buildExpense('expense-1', 12_000, ExpenseCategory.RENT, true),
      buildExpense('expense-2', 8_000, ExpenseCategory.UTILITY, true),
    ]);
    repository.findPendingExpenses.mockResolvedValue([
      buildExpense('expense-3', 7_000, ExpenseCategory.OTHER, false),
    ]);

    await expect(service.getReport(query)).resolves.toEqual({
      approximate: true,
      basis: 'cash-operational',
      window: {
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-05-31T23:59:59.000Z',
      },
      totals: {
        workOrders: {
          inProgress: 1,
          paused: 1,
          completed: 1,
          cancelled: 1,
        },
        paymentStatus: {
          pending: 1,
          partial: 2,
          paid: 1,
        },
        paymentsCollected: 230_000,
        pendingReceivables: 60_000,
        actualCosts: 70_000,
        paidExpenses: 20_000,
        pendingExpenses: 7_000,
        approximateUtility: 140_000,
      },
    });

    expect(repository.findSummaryWorkOrders).toHaveBeenCalledWith(query);
    expect(repository.findWorkOrdersWithFinancials).toHaveBeenCalledWith(query);
    expect(repository.findPaidExpenses).toHaveBeenCalledWith(query);
    expect(repository.findPendingExpenses).toHaveBeenCalledWith(query);
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('report=summary'),
    );
  });

  it('keeps pending receivables unknown when a pending balance has no payable estimate', async () => {
    repository.findSummaryWorkOrders.mockResolvedValue([
      buildSummaryWorkOrder(
        'wo-unknown',
        WorkOrderStatus.IN_PROGRESS,
        PaymentStatus.PENDING,
      ),
    ]);
    repository.findWorkOrdersWithFinancials.mockResolvedValue([
      buildFinancialWorkOrder({
        id: 'wo-unknown',
        paymentStatus: PaymentStatus.PENDING,
        payableAmount: null,
        payments: [20_000],
        actualCosts: [5_000],
      }),
    ]);
    repository.findPaidExpenses.mockResolvedValue([]);
    repository.findPendingExpenses.mockResolvedValue([]);

    await expect(service.getReport({})).resolves.toMatchObject({
      totals: {
        pendingReceivables: null,
        paymentsCollected: 20_000,
        actualCosts: 5_000,
        approximateUtility: 15_000,
      },
    });
  });
});

function buildSummaryWorkOrder(
  id: string,
  status: WorkOrderStatus,
  paymentStatus: PaymentStatus,
): SummaryWorkOrderReadModel {
  return { id, status, paymentStatus };
}

function buildFinancialWorkOrder({
  id,
  status = WorkOrderStatus.IN_PROGRESS,
  paymentStatus,
  payableAmount,
  payments,
  actualCosts,
}: {
  id: string;
  status?: WorkOrderStatus;
  paymentStatus: PaymentStatus;
  payableAmount: number | null;
  payments: number[];
  actualCosts: number[];
}): WorkOrderFinancialReadModel {
  return {
    id,
    number: Number(id.replace(/\D/g, '')) || 1,
    createdAt: new Date('2026-05-10T10:00:00.000Z'),
    status,
    paymentStatus,
    customerId: 'customer-1',
    assignedEmployeeId: null,
    Customer: { id: 'customer-1', name: 'Cliente Uno' },
    Vehicle: null,
    Component: null,
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
    WorkOrderActualCost: actualCosts.map((amount, index) => ({
      id: `${id}-cost-${index + 1}`,
      amount,
      category: 'OTHER',
      incurredAt: new Date(`2026-05-${12 + index}T10:00:00.000Z`),
    })),
  };
}

function buildExpense(
  id: string,
  amount: number,
  category: ExpenseCategory,
  paid: boolean,
): ExpenseReadModel {
  return {
    id,
    name: id,
    category,
    amount,
    costCenterId: null,
    expectedAt: new Date('2026-05-20T00:00:00.000Z'),
    paidAt: paid ? new Date('2026-05-21T00:00:00.000Z') : null,
    CostCenter: null,
  };
}
