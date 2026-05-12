import {
  EmployeeMonthlyPayrollStatus,
  EstimatePhase,
  InventoryMovementType,
  PaymentStatus,
  SupplierQuoteStatus,
  WorkOrderCostCategory,
  WorkOrderStatus,
} from '../../generated/prisma/enums';
import {
  DashboardActionItemCategory,
  DashboardActionItemDateBasis,
} from './dto/dashboard-action-items-response.dto';
import { DashboardRepository } from './dashboard.repository';
import { DashboardOverviewService } from './dashboard.service';

describe('DashboardOverviewService', () => {
  const repository = {
    findWorkOrders: jest.fn(),
    findOpenWorkOrdersForActions: jest.fn(),
    findReceivableWorkOrdersForActions: jest.fn(),
    aggregatePaymentsCollected: jest.fn(),
    aggregateActualCosts: jest.fn(),
    findPaidExpenses: jest.fn(),
    findPendingExpenses: jest.fn(),
    findPendingExpensesForActions: jest.fn(),
    findInventoryItemsWithMovements: jest.fn(),
    findInventoryItemsForActions: jest.fn(),
    findLatestPayrollSnapshot: jest.fn(),
    findRecentPayments: jest.fn(),
    findRecentExpenses: jest.fn(),
    findRecentCompletedWorkOrders: jest.fn(),
    findRecentInventoryMovements: jest.fn(),
  } as unknown as jest.Mocked<DashboardRepository>;

  let service: DashboardOverviewService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardOverviewService(repository);
  });

  it('returns a meaningful zero-state overview for empty ranges', async () => {
    repository.findWorkOrders.mockResolvedValue([]);
    repository.aggregatePaymentsCollected.mockResolvedValue(0);
    repository.aggregateActualCosts.mockResolvedValue(0);
    repository.findPaidExpenses.mockResolvedValue([]);
    repository.findPendingExpenses.mockResolvedValue([]);
    repository.findInventoryItemsWithMovements.mockResolvedValue([]);
    repository.findLatestPayrollSnapshot.mockResolvedValue(null);
    repository.findRecentPayments.mockResolvedValue([]);
    repository.findRecentExpenses.mockResolvedValue([]);
    repository.findRecentCompletedWorkOrders.mockResolvedValue([]);
    repository.findRecentInventoryMovements.mockResolvedValue([]);

    await expect(service.getOverview({})).resolves.toEqual({
      range: { from: null, to: null },
      kpis: {
        workOrders: { open: 0, completed: 0, paused: 0, cancelled: 0 },
        cash: {
          collected: 0,
          actualCosts: 0,
          paidExpenses: 0,
          pendingExpenses: 0,
          pendingReceivables: 0,
          approximateUtility: 0,
        },
        inventory: { lowStockCount: 0 },
        payroll: { grandTotal: null, status: null, monthLabel: null },
      },
      progress: {
        expenseCoverage: {
          paid: 0,
          expected: 0,
          ratio: null,
          remaining: 0,
        },
        payrollCoverage: {
          covered: 0,
          payrollTotal: 0,
          ratio: null,
          remaining: 0,
        },
        receivablesCollection: {
          collected: 0,
          knownPayable: 0,
          ratio: null,
          remaining: 0,
          unknownPayableCount: 0,
        },
      },
      alerts: {
        pendingReceivables: 0,
        pendingExpensesDue: 0,
        lowStockItems: 0,
        unknownPayables: 0,
        previews: {
          pendingReceivables: [],
          pendingExpenses: [],
          lowStockItems: [],
        },
      },
      recentActivity: [],
      metadata: {
        approximate: false,
        basis: 'dashboard-overview',
        notes: ['No matching dashboard records for the selected range.'],
        sectionDateBasis: {
          workOrders: 'createdAt/completedAt',
          cash: 'paidAt/incurredAt/expectedAt',
          inventory: 'occurredAt',
          payroll: 'year-month overlap',
          recentActivity: 'occurredAt',
        },
      },
    });
  });

  it('returns a safe empty action-items shell that echoes date-only range metadata', async () => {
    repository.findOpenWorkOrdersForActions.mockResolvedValue([]);
    repository.findReceivableWorkOrdersForActions.mockResolvedValue([]);
    repository.findPendingExpensesForActions.mockResolvedValue([]);
    repository.findInventoryItemsForActions.mockResolvedValue([]);
    repository.aggregatePaymentsCollected.mockResolvedValue(0);
    repository.findLatestPayrollSnapshot.mockResolvedValue(null);

    await expect(
      service.getActionItems({
        from: new Date('2026-05-01T00:00:00.000Z'),
        to: new Date('2026-05-31T00:00:00.000Z'),
      }),
    ).resolves.toEqual({
      range: { from: '2026-05-01', to: '2026-05-31' },
      items: [],
      metadata: {
        approximate: false,
        generatedAt: expect.any(String) as string,
        itemCount: 0,
        categoryCounts: {
          [DashboardActionItemCategory.WORK_ORDER_OVERDUE]: 0,
          [DashboardActionItemCategory.RECEIVABLE]: 0,
          [DashboardActionItemCategory.EXPENSE]: 0,
          [DashboardActionItemCategory.LOW_STOCK]: 0,
          [DashboardActionItemCategory.PRICE_RISK]: 0,
          [DashboardActionItemCategory.CASH_RISK]: 0,
        },
        dateBasis: {
          [DashboardActionItemCategory.WORK_ORDER_OVERDUE]:
            DashboardActionItemDateBasis.ESTIMATED_COMPLETION_AT,
          [DashboardActionItemCategory.RECEIVABLE]:
            DashboardActionItemDateBasis.ESTIMATED_COLLECTION_AT,
          [DashboardActionItemCategory.EXPENSE]:
            DashboardActionItemDateBasis.EXPECTED_AT,
          [DashboardActionItemCategory.LOW_STOCK]:
            DashboardActionItemDateBasis.STOCK_AS_OF_TO,
          [DashboardActionItemCategory.PRICE_RISK]:
            DashboardActionItemDateBasis.ACTIVE_QUOTE_STATE_AS_OF_TO,
          [DashboardActionItemCategory.CASH_RISK]:
            DashboardActionItemDateBasis.SELECTED_RANGE_COLLECTIONS_VS_PENDING_EXPENSES,
        },
        notes: ['Nullable amounts represent unknown values, not zero.'],
      },
    });
  });

  it('maps action categories with date bases, conservative unknown amounts, and severity order', async () => {
    repository.findOpenWorkOrdersForActions.mockResolvedValue([
      buildWorkOrder({
        id: 'wo-overdue',
        number: 2001,
        status: WorkOrderStatus.IN_PROGRESS,
        paymentStatus: PaymentStatus.PENDING,
        customerName: 'Motores Andinos',
        createdAt: '2026-04-20T10:00:00.000Z',
        estimatedCompletionAt: '2026-05-10T00:00:00.000Z',
        estimatedCollectionAt: '2026-05-20T00:00:00.000Z',
        payableAmount: 900000,
        payments: [],
        actualCosts: [],
        externalLink: 'https://example.test/ot-2001',
      }),
      buildWorkOrder({
        id: 'wo-paused',
        number: 2002,
        status: WorkOrderStatus.PAUSED,
        paymentStatus: PaymentStatus.PENDING,
        customerName: 'Taller Central',
        createdAt: '2026-05-01T10:00:00.000Z',
        estimatedCompletionAt: '2026-05-29T00:00:00.000Z',
        payableAmount: 300000,
        payments: [],
        actualCosts: [],
      }),
    ]);
    repository.findReceivableWorkOrdersForActions.mockResolvedValue([
      buildWorkOrder({
        id: 'wo-receivable-known',
        number: 2003,
        status: WorkOrderStatus.IN_PROGRESS,
        paymentStatus: PaymentStatus.PARTIAL,
        customerName: 'Acme SAS',
        createdAt: '2026-05-02T10:00:00.000Z',
        estimatedCollectionAt: '2026-05-14T00:00:00.000Z',
        payableAmount: 500000,
        payments: [125000],
        actualCosts: [],
      }),
      buildWorkOrder({
        id: 'wo-receivable-unknown',
        number: 2004,
        status: WorkOrderStatus.IN_PROGRESS,
        paymentStatus: PaymentStatus.PENDING,
        customerName: 'Sin estimado',
        createdAt: '2026-05-03T10:00:00.000Z',
        estimatedCollectionAt: '2026-05-16T00:00:00.000Z',
        payableAmount: null,
        payments: [],
        actualCosts: [],
      }),
    ]);
    repository.findPendingExpensesForActions.mockResolvedValue([
      {
        id: 'expense-pending',
        name: 'Arriendo sede mayo',
        amount: 1500000,
        expectedAt: new Date('2026-05-13T00:00:00.000Z'),
        paidAt: null,
        CostCenter: { id: 'office', code: 'OFFICE', name: 'Oficina' },
      },
    ]);
    repository.findInventoryItemsForActions.mockResolvedValue([
      {
        id: 'inventory-low',
        name: 'Inyector Bosch',
        minimumStock: 5,
        defaultSalePrice: null,
        InventoryMovement: [
          { movementType: InventoryMovementType.IN, quantity: 4 },
          { movementType: InventoryMovementType.OUT, quantity: 1 },
        ],
        SupplierQuoteHistory: [
          {
            status: SupplierQuoteStatus.VOIDED,
            quotedCost: 180000,
            quotedAt: new Date('2026-05-01T00:00:00.000Z'),
          },
        ],
      },
    ]);
    repository.aggregatePaymentsCollected.mockResolvedValue(100000);
    repository.findLatestPayrollSnapshot.mockResolvedValue({
      id: 'payroll-2026-05',
      year: 2026,
      month: 5,
      status: EmployeeMonthlyPayrollStatus.DRAFT,
      grandTotal: 900000,
    });

    const result = await service.getActionItems({
      from: new Date('2026-05-01T00:00:00.000Z'),
      to: new Date('2026-05-31T23:59:59.999Z'),
    });

    expect(result.items.map((item) => item.category)).toEqual([
      DashboardActionItemCategory.WORK_ORDER_OVERDUE,
      DashboardActionItemCategory.EXPENSE,
      DashboardActionItemCategory.RECEIVABLE,
      DashboardActionItemCategory.RECEIVABLE,
      DashboardActionItemCategory.WORK_ORDER_OVERDUE,
      DashboardActionItemCategory.LOW_STOCK,
      DashboardActionItemCategory.PRICE_RISK,
      DashboardActionItemCategory.CASH_RISK,
    ]);
    expect(result.items[0]).toMatchObject({
      id: 'WORK_ORDER_OVERDUE:wo-overdue',
      severity: 'critical',
      status: 'overdue',
      dueAt: '2026-05-10',
      amount: null,
      dateBasis: DashboardActionItemDateBasis.ESTIMATED_COMPLETION_AT,
      entity: {
        type: 'workOrder',
        id: 'wo-overdue',
        label: 'OT 2001 · Motores Andinos',
        href: 'https://example.test/ot-2001',
      },
    });
    expect(
      result.items.find((item) => item.id === 'RECEIVABLE:wo-receivable-known'),
    ).toMatchObject({
      amount: 375000,
      riskFlags: [],
      dateBasis: DashboardActionItemDateBasis.ESTIMATED_COLLECTION_AT,
    });
    expect(
      result.items.find(
        (item) => item.id === 'RECEIVABLE:wo-receivable-unknown',
      ),
    ).toMatchObject({
      amount: null,
      riskFlags: ['unknownPayable'],
      notes: [
        'Payable amount is unknown; this is not a zero-value receivable.',
      ],
    });
    expect(
      result.items.find((item) => item.id === 'PRICE_RISK:inventory-low'),
    ).toMatchObject({
      amount: null,
      riskFlags: ['unknownPrice'],
      severity: 'info',
    });
    expect(
      result.items.find((item) => item.id === 'CASH_RISK:selected-range'),
    ).toMatchObject({
      amount: null,
      riskFlags: ['cashPressureApproximate'],
      notes: expect.arrayContaining([
        'Advisory only: selected-range collections are below known pending expenses/payroll pressure.',
      ]) as string[],
    });
    expect(result.metadata).toMatchObject({
      approximate: true,
      itemCount: 8,
      categoryCounts: {
        WORK_ORDER_OVERDUE: 2,
        RECEIVABLE: 2,
        EXPENSE: 1,
        LOW_STOCK: 1,
        PRICE_RISK: 1,
        CASH_RISK: 1,
      },
    });
  });

  it('marks unknown payable metrics as approximate, calculates ratios, and bounds previews/activity', async () => {
    repository.findWorkOrders.mockResolvedValue([
      buildWorkOrder({
        id: 'wo-paid',
        number: 1001,
        status: WorkOrderStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
        customerName: 'Acme Industrial SAS',
        createdAt: '2026-05-05T10:00:00.000Z',
        completedAt: '2026-05-09T13:30:00.000Z',
        estimatedCollectionAt: '2026-05-09T15:00:00.000Z',
        payableAmount: 620000,
        payments: [620000],
        actualCosts: [182000],
      }),
      buildWorkOrder({
        id: 'wo-partial',
        number: 1002,
        status: WorkOrderStatus.IN_PROGRESS,
        paymentStatus: PaymentStatus.PARTIAL,
        customerName: 'Ana Gomez',
        createdAt: '2026-05-10T10:00:00.000Z',
        estimatedCollectionAt: '2026-05-19T15:00:00.000Z',
        payableAmount: 250000,
        payments: [100000],
        actualCosts: [110000],
      }),
      buildWorkOrder({
        id: 'wo-unknown',
        number: 1003,
        status: WorkOrderStatus.PAUSED,
        paymentStatus: PaymentStatus.PARTIAL,
        customerName: 'Acme Industrial SAS',
        createdAt: '2026-05-11T10:00:00.000Z',
        estimatedCollectionAt: '2026-05-21T18:00:00.000Z',
        payableAmount: null,
        payments: [30000],
        actualCosts: [70000],
      }),
      ...Array.from({ length: 4 }, (_, index) =>
        buildWorkOrder({
          id: `wo-extra-${index}`,
          number: 1100 + index,
          status: WorkOrderStatus.IN_PROGRESS,
          paymentStatus: PaymentStatus.PENDING,
          customerName: `Cliente ${index}`,
          createdAt: `2026-05-${20 + index}T09:00:00.000Z`,
          estimatedCollectionAt: `2026-05-${20 + index}T18:00:00.000Z`,
          payableAmount: 100000,
          payments: [0],
          actualCosts: [10000],
        }),
      ),
    ]);
    repository.aggregatePaymentsCollected.mockResolvedValue(750000);
    repository.aggregateActualCosts.mockResolvedValue(402000);
    repository.findPaidExpenses.mockResolvedValue([
      {
        id: 'expense-paid-1',
        name: 'Factura energía abril',
        amount: 420000,
        expectedAt: new Date('2026-04-25T00:00:00.000Z'),
        paidAt: new Date('2026-04-26T14:30:00.000Z'),
        CostCenter: { id: 'general', code: 'GENERAL', name: 'General' },
      },
      {
        id: 'expense-paid-2',
        name: 'Mensajería documentos cámara de comercio',
        amount: 38000,
        expectedAt: new Date('2026-05-08T00:00:00.000Z'),
        paidAt: new Date('2026-05-08T16:00:00.000Z'),
        CostCenter: null,
      },
    ]);
    repository.findPendingExpenses.mockResolvedValue([
      {
        id: 'expense-pending-1',
        name: 'Arriendo sede mayo',
        amount: 1500000,
        expectedAt: new Date('2026-05-15T00:00:00.000Z'),
        paidAt: null,
        CostCenter: { id: 'oficina', code: 'OFICINA', name: 'Oficina' },
      },
      ...Array.from({ length: 4 }, (_, index) => ({
        id: `expense-pending-${index + 2}`,
        name: `Pendiente ${index}`,
        amount: 1000 * (index + 1),
        expectedAt: new Date(`2026-05-${16 + index}T00:00:00.000Z`),
        paidAt: null,
        CostCenter: null,
      })),
    ]);
    repository.findInventoryItemsWithMovements.mockResolvedValue([
      {
        id: 'inventory-low-1',
        name: 'Inyector Bosch 0445120231',
        minimumStock: 5,
        InventoryMovement: [
          { movementType: InventoryMovementType.IN, quantity: 6 },
          { movementType: InventoryMovementType.OUT, quantity: 2 },
        ],
      },
      {
        id: 'inventory-low-2',
        name: 'Kit filtros',
        minimumStock: 2,
        InventoryMovement: [
          { movementType: InventoryMovementType.IN, quantity: 2 },
          { movementType: InventoryMovementType.OUT, quantity: 2 },
        ],
      },
    ]);
    repository.findLatestPayrollSnapshot.mockResolvedValue({
      id: 'payroll-2026-04',
      year: 2026,
      month: 4,
      status: EmployeeMonthlyPayrollStatus.FINALIZED,
      grandTotal: 5850000,
    });
    repository.findRecentPayments.mockResolvedValue([
      {
        id: 'payment-1',
        amount: 620000,
        paidAt: new Date('2026-05-09T15:10:00.000Z'),
        WorkOrder: {
          id: 'wo-paid',
          number: 1001,
          Customer: { name: 'Acme Industrial SAS' },
        },
      },
      {
        id: 'payment-2',
        amount: 100000,
        paidAt: new Date('2026-05-18T12:00:00.000Z'),
        WorkOrder: {
          id: 'wo-partial',
          number: 1002,
          Customer: { name: 'Ana Gomez' },
        },
      },
    ]);
    repository.findRecentExpenses.mockResolvedValue([
      {
        id: 'expense-paid-2',
        name: 'Mensajería documentos cámara de comercio',
        amount: 38000,
        paidAt: new Date('2026-05-08T16:00:00.000Z'),
      },
    ]);
    repository.findRecentCompletedWorkOrders.mockResolvedValue([
      {
        id: 'wo-paid',
        number: 1001,
        summary: 'Reparación integral de inyector Bosch',
        completedAt: new Date('2026-05-09T13:30:00.000Z'),
        Customer: { name: 'Acme Industrial SAS' },
      },
    ]);
    repository.findRecentInventoryMovements.mockResolvedValue([
      {
        id: 'movement-1',
        occurredAt: new Date('2026-05-06T09:30:00.000Z'),
        movementType: InventoryMovementType.OUT,
        quantity: 2,
        InventoryItem: { name: 'Inyector Bosch 0445120231' },
      },
    ]);

    await expect(
      service.getOverview({
        from: new Date('2026-05-01T00:00:00.000Z'),
        to: new Date('2026-05-31T23:59:59.999Z'),
      }),
    ).resolves.toMatchObject({
      range: {
        from: '2026-05-01T00:00:00.000Z',
        to: '2026-05-31T23:59:59.999Z',
      },
      kpis: {
        workOrders: { open: 5, completed: 1, paused: 1, cancelled: 0 },
        cash: {
          collected: 750000,
          actualCosts: 402000,
          paidExpenses: 458000,
          pendingExpenses: 1510000,
          pendingReceivables: null,
          approximateUtility: -110000,
        },
        inventory: { lowStockCount: 2 },
        payroll: {
          grandTotal: 5850000,
          status: 'FINALIZED',
          monthLabel: '2026-04',
        },
      },
      progress: {
        expenseCoverage: {
          paid: 750000,
          expected: 7360000,
          ratio: 750000 / 7360000,
          remaining: 6610000,
        },
        payrollCoverage: {
          covered: 750000,
          payrollTotal: 5850000,
          ratio: 750000 / 5850000,
          remaining: 5100000,
        },
        receivablesCollection: {
          collected: 750000,
          knownPayable: 870000,
          ratio: 750000 / 870000,
          remaining: 120000,
          unknownPayableCount: 1,
        },
      },
      alerts: {
        pendingReceivables: 5,
        pendingExpensesDue: 5,
        lowStockItems: 2,
        unknownPayables: 1,
      },
      metadata: {
        approximate: true,
        basis: 'dashboard-overview',
      },
    });

    const overview = await service.getOverview({
      from: new Date('2026-05-01T00:00:00.000Z'),
      to: new Date('2026-05-31T23:59:59.999Z'),
    });

    expect(overview.alerts.previews.pendingReceivables).toHaveLength(3);
    expect(overview.alerts.previews.pendingExpenses).toHaveLength(3);
    expect(overview.alerts.previews.lowStockItems).toHaveLength(2);
    expect(overview.recentActivity).toHaveLength(5);
    expect(overview.recentActivity[0]?.occurredAt).toBe(
      '2026-05-18T12:00:00.000Z',
    );
    expect(overview.metadata.notes).toEqual(
      expect.arrayContaining([
        'Pending receivables are approximate because 1 work order has no reliable payable amount.',
      ]),
    );
  });
});

function buildWorkOrder({
  id,
  number,
  status,
  paymentStatus,
  customerName,
  createdAt,
  completedAt,
  estimatedCompletionAt,
  estimatedCollectionAt,
  payableAmount,
  payments,
  actualCosts,
  externalLink,
}: {
  id: string;
  number: number;
  status: WorkOrderStatus;
  paymentStatus: PaymentStatus;
  customerName: string;
  createdAt: string;
  completedAt?: string;
  estimatedCompletionAt?: string;
  estimatedCollectionAt?: string;
  payableAmount: number | null;
  payments: number[];
  actualCosts: number[];
  externalLink?: string;
}) {
  return {
    id,
    number,
    summary: `OT ${number}`,
    status,
    paymentStatus,
    createdAt: new Date(createdAt),
    completedAt: completedAt ? new Date(completedAt) : null,
    estimatedCompletionAt: estimatedCompletionAt
      ? new Date(estimatedCompletionAt)
      : null,
    estimatedCollectionAt: estimatedCollectionAt
      ? new Date(estimatedCollectionAt)
      : null,
    externalLink: externalLink ?? null,
    Customer: { name: customerName },
    WorkOrderEstimate:
      payableAmount === null
        ? []
        : [{ phase: EstimatePhase.FINAL, totalPriceAmount: payableAmount }],
    WorkOrderPayment: payments.map((amount, index) => ({
      id: `${id}-payment-${index}`,
      amount,
      paidAt: new Date(`2026-05-${10 + index}T10:00:00.000Z`),
    })),
    WorkOrderActualCost: actualCosts.map((amount, index) => ({
      id: `${id}-cost-${index}`,
      amount,
      category: WorkOrderCostCategory.OTHER,
      incurredAt: new Date(`2026-05-${12 + index}T10:00:00.000Z`),
    })),
  };
}
