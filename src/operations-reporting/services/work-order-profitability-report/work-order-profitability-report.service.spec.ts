import { Test } from '@nestjs/testing';

import {
  EstimatePhase,
  PaymentStatus,
  WorkOrderCostCategory,
  WorkOrderStatus,
} from '../../../../generated/prisma/enums';
import {
  OperationsReportingRepository,
  type WorkOrderFinancialReadModel,
} from '../../persistence/operations-reporting.repository';
import { WorkOrderProfitabilityReportService } from './work-order-profitability-report.service';

describe('WorkOrderProfitabilityReportService', () => {
  const repository = {
    findWorkOrdersWithFinancials: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<OperationsReportingRepository, 'findWorkOrdersWithFinancials'>
  >;

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
          {
            id: 'payment-1',
            amount: 40,
            paidAt: new Date('2026-05-02T00:00:00.000Z'),
          },
          {
            id: 'payment-2',
            amount: 10,
            paidAt: new Date('2026-05-03T00:00:00.000Z'),
          },
        ],
        WorkOrderActualCost: [
          {
            id: 'cost-1',
            amount: 60,
            category: WorkOrderCostCategory.MISC,
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
    const workOrders: WorkOrderFinancialReadModel[] = [
      {
        id: 'wo-2',
        number: 102,
        createdAt: new Date('2026-05-05T10:00:00.000Z'),
        status: WorkOrderStatus.IN_PROGRESS,
        paymentStatus: PaymentStatus.PARTIAL,
        customerId: 'customer-2',
        assignedEmployeeId: null,
        Customer: null,
        Vehicle: null,
        Component: null,
        Employee: null,
        WorkOrderEstimate: [],
        WorkOrderPayment: [
          {
            id: 'payment-3',
            amount: 25,
            paidAt: new Date('2026-05-06T00:00:00.000Z'),
          },
        ],
        WorkOrderActualCost: [
          {
            id: 'cost-2',
            amount: 15,
            category: WorkOrderCostCategory.OTHER,
            incurredAt: new Date('2026-05-07T00:00:00.000Z'),
          },
        ],
      },
    ];

    repository.findWorkOrdersWithFinancials.mockResolvedValue(workOrders);

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

  it('keeps known-payable and unknown-payable work orders distinct in the same profitability report', async () => {
    const workOrders: WorkOrderFinancialReadModel[] = [
      {
        id: 'seed-work-order-workshop-injector-repair',
        number: 201,
        createdAt: new Date('2026-05-09T10:00:00.000Z'),
        status: WorkOrderStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
        customerId: 'seed-customer-acme-industrial',
        assignedEmployeeId: 'seed-employee-ana-torres',
        Customer: {
          id: 'seed-customer-acme-industrial',
          name: 'Acme Industrial SAS',
        },
        Vehicle: null,
        Component: null,
        Employee: null,
        WorkOrderEstimate: [
          { phase: EstimatePhase.FINAL, totalPriceAmount: 620000 },
        ],
        WorkOrderPayment: [
          {
            id: 'payment-known',
            amount: 620000,
            paidAt: new Date('2026-05-09T15:00:00.000Z'),
          },
        ],
        WorkOrderActualCost: [
          {
            id: 'cost-known',
            amount: 182000,
            category: WorkOrderCostCategory.DIRECT_PURCHASE,
            incurredAt: new Date('2026-05-08T12:00:00.000Z'),
          },
        ],
      },
      {
        id: 'seed-work-order-workshop-unknown-payable',
        number: 202,
        createdAt: new Date('2026-05-10T10:00:00.000Z'),
        status: WorkOrderStatus.IN_PROGRESS,
        paymentStatus: PaymentStatus.PARTIAL,
        customerId: 'seed-customer-acme-industrial',
        assignedEmployeeId: 'seed-employee-ana-torres',
        Customer: {
          id: 'seed-customer-acme-industrial',
          name: 'Acme Industrial SAS',
        },
        Vehicle: null,
        Component: null,
        Employee: null,
        WorkOrderEstimate: [],
        WorkOrderPayment: [
          {
            id: 'payment-unknown',
            amount: 30000,
            paidAt: new Date('2026-05-10T15:00:00.000Z'),
          },
        ],
        WorkOrderActualCost: [
          {
            id: 'cost-unknown',
            amount: 70000,
            category: WorkOrderCostCategory.OUTSOURCED_SERVICE,
            incurredAt: new Date('2026-05-10T12:00:00.000Z'),
          },
        ],
      },
    ];

    repository.findWorkOrdersWithFinancials.mockResolvedValue(workOrders);

    const report = await service.getReport({});

    expect(report.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          workOrderId: 'seed-work-order-workshop-injector-repair',
          customerName: 'Acme Industrial SAS',
          payableAmount: 620000,
          paidTotal: 620000,
          actualCostTotal: 182000,
          grossUtility: 438000,
        }),
        expect.objectContaining({
          workOrderId: 'seed-work-order-workshop-unknown-payable',
          customerName: 'Acme Industrial SAS',
          payableAmount: null,
          paidTotal: 30000,
          actualCostTotal: 70000,
          grossUtility: null,
          grossMargin: null,
        }),
      ]),
    );
  });
});
