import { Test } from '@nestjs/testing';

import { EstimatePhase, PaymentStatus, WorkOrderStatus } from '../../../../generated/prisma/enums';
import {
  OperationsReportingRepository,
  type WorkOrderFinancialReadModel,
} from '../../persistence/operations-reporting.repository';
import { WorkOrderProfitabilityReportService } from './work-order-profitability-report.service';

describe('WorkOrderProfitabilityReportService', () => {
  const repository = {
    findWorkOrdersWithFinancials: jest.fn(),
  } as unknown as jest.Mocked<Pick<OperationsReportingRepository, 'findWorkOrdersWithFinancials'>>;

  let service: WorkOrderProfitabilityReportService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        WorkOrderProfitabilityReportService,
        {
          provide: OperationsReportingRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(WorkOrderProfitabilityReportService);
  });

  it('maps each work order into profitability rows with payable, paid, costs, utility, and margin', async () => {
    const workOrders: WorkOrderFinancialReadModel[] = [
      {
        id: 'wo-1',
        number: 101,
        createdAt: new Date('2026-05-01T10:00:00.000Z'),
        status: WorkOrderStatus.COMPLETED,
        paymentStatus: PaymentStatus.PARTIAL,
        customerId: 'customer-1',
        assignedEmployeeId: 'employee-1',
        Customer: { id: 'customer-1', name: 'Acme Fleet' },
        Vehicle: null,
        Component: null,
        Employee: null,
        WorkOrderEstimate: [
          { phase: EstimatePhase.INITIAL, totalPriceAmount: 120 },
          { phase: EstimatePhase.FINAL, totalPriceAmount: 150 },
        ],
        WorkOrderPayment: [
          { id: 'payment-1', amount: 40, paidAt: new Date('2026-05-02T00:00:00.000Z') },
          { id: 'payment-2', amount: 10, paidAt: new Date('2026-05-03T00:00:00.000Z') },
        ],
        WorkOrderActualCost: [
          {
            id: 'cost-1',
            amount: 60,
            category: 'PART' as never,
            incurredAt: new Date('2026-05-04T00:00:00.000Z'),
          },
        ],
      },
    ];

    repository.findWorkOrdersWithFinancials.mockResolvedValue(workOrders);

    await expect(
      service.getReport({
        dateFrom: new Date('2026-05-01T00:00:00.000Z'),
        dateTo: new Date('2026-05-31T23:59:59.000Z'),
        customerId: 'customer-1',
      }),
    ).resolves.toEqual({
      approximate: true,
      basis: 'cash-operational',
      window: {
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-05-31T23:59:59.000Z',
      },
      data: [
        {
          workOrderId: 'wo-1',
          customerName: 'Acme Fleet',
          payableAmount: 150,
          paidTotal: 50,
          actualCostTotal: 60,
          grossUtility: 90,
          grossMargin: 0.6,
        },
      ],
    });

    expect(repository.findWorkOrdersWithFinancials).toHaveBeenCalledWith({
      dateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dateTo: new Date('2026-05-31T23:59:59.000Z'),
      customerId: 'customer-1',
    });
  });

  it('keeps payable-derived fields null when a work order has no initial or final estimate', async () => {
    repository.findWorkOrdersWithFinancials.mockResolvedValue([
      {
        id: 'wo-2',
        number: 102,
        createdAt: new Date('2026-05-05T10:00:00.000Z'),
        status: WorkOrderStatus.IN_PROGRESS,
        paymentStatus: PaymentStatus.PARTIAL,
        customerId: null,
        assignedEmployeeId: null,
        Customer: null,
        Vehicle: null,
        Component: null,
        Employee: null,
        WorkOrderEstimate: [],
        WorkOrderPayment: [
          { id: 'payment-3', amount: 25, paidAt: new Date('2026-05-06T00:00:00.000Z') },
        ],
        WorkOrderActualCost: [
          {
            id: 'cost-2',
            amount: 15,
            category: 'LABOR' as never,
            incurredAt: new Date('2026-05-07T00:00:00.000Z'),
          },
        ],
      },
    ] as WorkOrderFinancialReadModel[]);

    await expect(service.getReport({})).resolves.toEqual({
      approximate: true,
      basis: 'cash-operational',
      window: { dateFrom: null, dateTo: null },
      data: [
        {
          workOrderId: 'wo-2',
          customerName: null,
          payableAmount: null,
          paidTotal: 25,
          actualCostTotal: 15,
          grossUtility: null,
          grossMargin: null,
        },
      ],
    });
  });
});
