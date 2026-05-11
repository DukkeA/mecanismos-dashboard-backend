import { Test } from '@nestjs/testing';

import {
  EmployeeType,
  EstimatePhase,
  PaymentStatus,
  WorkOrderStatus,
} from '../../../../generated/prisma/enums';
import {
  OperationsReportingRepository,
  type MechanicAssignmentsReadModel,
} from '../../persistence/operations-reporting.repository';
import { MechanicsProductivityReportService } from './mechanics-productivity-report.service';

describe('MechanicsProductivityReportService', () => {
  const repository = {
    findMechanicsWithAssignments: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<OperationsReportingRepository, 'findMechanicsWithAssignments'>
  >;

  let service: MechanicsProductivityReportService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        MechanicsProductivityReportService,
        {
          provide: OperationsReportingRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(MechanicsProductivityReportService);
  });

  it('aggregates assigned work orders for mechanics and excludes mechanics without assignments', async () => {
    repository.findMechanicsWithAssignments.mockResolvedValue([
      {
        id: 'employee-1',
        name: 'Marta',
        type: EmployeeType.MECHANIC,
        isActive: true,
        WorkOrder: [
          {
            id: 'wo-1',
            number: 200,
            status: WorkOrderStatus.COMPLETED,
            paymentStatus: PaymentStatus.PAID,
            WorkOrderEstimate: [
              { phase: EstimatePhase.INITIAL, totalPriceAmount: 90 },
              { phase: EstimatePhase.FINAL, totalPriceAmount: 120 },
            ],
            WorkOrderPayment: [
              {
                id: 'payment-1',
                amount: 70,
                paidAt: new Date('2026-05-02T00:00:00.000Z'),
              },
            ],
            WorkOrderActualCost: [
              {
                id: 'cost-1',
                amount: 30,
                category: 'PART' as never,
                incurredAt: new Date('2026-05-03T00:00:00.000Z'),
              },
            ],
          },
        ],
      },
      {
        id: 'employee-2',
        name: 'No Assignments',
        type: EmployeeType.MECHANIC,
        isActive: true,
        WorkOrder: [],
      },
    ] as MechanicAssignmentsReadModel[]);

    await expect(
      service.getReport({
        dateFrom: new Date('2026-05-01T00:00:00.000Z'),
        dateTo: new Date('2026-05-31T23:59:59.000Z'),
        assignedEmployeeId: 'employee-1',
        includeInactiveMechanics: false,
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
          employeeId: 'employee-1',
          employeeName: 'Marta',
          assignedOrderCount: 1,
          payableTotal: 120,
          paidTotal: 70,
          actualCosts: 30,
          grossUtility: 90,
          unknownPayableCount: 0,
        },
      ],
    });

    expect(repository.findMechanicsWithAssignments).toHaveBeenCalledWith({
      dateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dateTo: new Date('2026-05-31T23:59:59.000Z'),
      assignedEmployeeId: 'employee-1',
      includeInactiveMechanics: false,
    });
  });

  it('tracks unknown payable counts and keeps payable-derived mechanic totals null when none are known', async () => {
    repository.findMechanicsWithAssignments.mockResolvedValue([
      {
        id: 'employee-3',
        name: 'Lucio',
        type: EmployeeType.MECHANIC,
        isActive: false,
        WorkOrder: [
          {
            id: 'wo-2',
            number: 201,
            status: WorkOrderStatus.IN_PROGRESS,
            paymentStatus: PaymentStatus.PARTIAL,
            WorkOrderEstimate: [],
            WorkOrderPayment: [
              {
                id: 'payment-2',
                amount: 25,
                paidAt: new Date('2026-05-04T00:00:00.000Z'),
              },
            ],
            WorkOrderActualCost: [
              {
                id: 'cost-2',
                amount: 18,
                category: 'LABOR' as never,
                incurredAt: new Date('2026-05-05T00:00:00.000Z'),
              },
            ],
          },
        ],
      },
    ] as MechanicAssignmentsReadModel[]);

    await expect(
      service.getReport({ includeInactiveMechanics: true }),
    ).resolves.toEqual({
      approximate: true,
      basis: 'cash-operational',
      window: { dateFrom: null, dateTo: null },
      data: [
        {
          employeeId: 'employee-3',
          employeeName: 'Lucio',
          assignedOrderCount: 1,
          payableTotal: null,
          paidTotal: 25,
          actualCosts: 18,
          grossUtility: null,
          unknownPayableCount: 1,
        },
      ],
    });
  });
});
