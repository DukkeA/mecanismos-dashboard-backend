import type { Prisma } from '../../generated/prisma/client';
import { EmployeeType } from '../../generated/prisma/enums';
import {
  EMPLOYEE_MONTHLY_PAYROLL_PRISMA_CLIENT,
  EmployeeMonthlyPayrollRepository,
} from './employee-monthly-payroll.repository';

describe('EmployeeMonthlyPayrollRepository', () => {
  it('creates a new draft period transactionally from active employees and in-month bonuses', async () => {
    const transactionClient = buildTransactionClient();
    const transaction = jest.fn(
      (callback: (tx: typeof transactionClient) => unknown) =>
        callback(transactionClient),
    );
    const repository = new EmployeeMonthlyPayrollRepository({
      $transaction: transaction,
    } as never);

    await expect(
      repository.generateDraft({
        year: 2026,
        month: 5,
        window: {
          start: new Date('2026-05-01T00:00:00.000Z'),
          end: new Date('2026-06-01T00:00:00.000Z'),
        },
      }),
    ).resolves.toMatchObject({
      id: 'payroll-2026-05',
      year: 2026,
      month: 5,
      status: 'DRAFT',
      salaryTotal: 5700000,
      bonusTotal: 240000,
      grandTotal: 5940000,
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(
      transactionClient.employeeMonthlyPayroll.upsert,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          year_month: { year: 2026, month: 5 },
        },
      }),
    );
    expect(transactionClient.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
      }),
    );
    expect(transactionClient.employeeBonus.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['employeeId'],
        where: {
          paidAt: {
            gte: new Date('2026-05-01T00:00:00.000Z'),
            lt: new Date('2026-06-01T00:00:00.000Z'),
          },
        },
      }),
    );
  });

  it('replaces draft lines instead of appending duplicates when regenerating a draft', async () => {
    const transactionClient = buildTransactionClient({
      currentPayroll: {
        id: 'payroll-2026-05',
        year: 2026,
        month: 5,
        status: 'DRAFT',
      },
    });
    const repository = new EmployeeMonthlyPayrollRepository({
      $transaction: jest.fn(
        (callback: (tx: typeof transactionClient) => unknown) =>
          callback(transactionClient),
      ),
    } as never);

    await repository.generateDraft({
      year: 2026,
      month: 5,
      window: {
        start: new Date('2026-05-01T00:00:00.000Z'),
        end: new Date('2026-06-01T00:00:00.000Z'),
      },
    });

    expect(
      transactionClient.employeeMonthlyPayrollLine.deleteMany,
    ).toHaveBeenCalledWith({
      where: { payrollId: 'payroll-2026-05' },
    });
    expect(
      transactionClient.employeeMonthlyPayrollLine.createMany,
    ).toHaveBeenCalled();

    const regeneratedLines =
      transactionClient.employeeMonthlyPayrollLine.createMany.mock.calls[0]?.[0]
        ?.data ?? [];

    expect(regeneratedLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          payrollId: 'payroll-2026-05',
          employeeName: 'Ana Torres',
          baseSalaryMonthlySnapshot: 2500000,
          bonusTotal: 150000,
          totalPay: 2650000,
        }),
        expect.objectContaining({
          payrollId: 'payroll-2026-05',
          employeeName: 'Mario Rincon',
          baseSalaryMonthlySnapshot: 3200000,
          bonusTotal: 90000,
          totalPay: 3290000,
        }),
      ]),
    );
  });

  it('snapshots active employees only with employee and cost-center identity copies', async () => {
    const transactionClient = buildTransactionClient();
    const repository = new EmployeeMonthlyPayrollRepository({
      $transaction: jest.fn(
        (callback: (tx: typeof transactionClient) => unknown) =>
          callback(transactionClient),
      ),
    } as never);

    await repository.generateDraft({
      year: 2026,
      month: 5,
      window: {
        start: new Date('2026-05-01T00:00:00.000Z'),
        end: new Date('2026-06-01T00:00:00.000Z'),
      },
    });

    const createManyArgs =
      transactionClient.employeeMonthlyPayrollLine.createMany.mock
        .calls[0]?.[0];
    const createdLines = createManyArgs?.data ?? [];

    expect(createdLines).toHaveLength(2);
    expect(createdLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          employeeId: 'employee-1',
          employeeName: 'Ana Torres',
          employeeType: EmployeeType.MECHANIC,
          costCenterId: 'cost-center-general',
          costCenterCode: 'GENERAL',
          costCenterName: 'General',
        }),
        expect.objectContaining({
          employeeId: 'employee-2',
          employeeName: 'Mario Rincon',
          employeeType: EmployeeType.ADMIN,
          costCenterId: 'cost-center-oficina',
          costCenterCode: 'OFICINA',
          costCenterName: 'Oficina',
        }),
      ]),
    );
  });

  it('includes only paid bonuses within the target month and keeps missing bonuses at zero', async () => {
    const transactionClient = buildTransactionClient({
      groupedBonuses: [
        { employeeId: 'employee-1', _sum: { amount: 150000 }, _count: 1 },
      ],
    });
    const repository = new EmployeeMonthlyPayrollRepository({
      $transaction: jest.fn(
        (callback: (tx: typeof transactionClient) => unknown) =>
          callback(transactionClient),
      ),
    } as never);

    const payroll = await repository.generateDraft({
      year: 2026,
      month: 5,
      window: {
        start: new Date('2026-05-01T00:00:00.000Z'),
        end: new Date('2026-06-01T00:00:00.000Z'),
      },
    });

    expect(payroll.bonusTotal).toBe(150000);
    expect(payroll.grandTotal).toBe(5850000);
    expect(payroll.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          employeeId: 'employee-1',
          bonusTotal: 150000,
          bonusCount: 1,
          totalPay: 2650000,
        }),
        expect.objectContaining({
          employeeId: 'employee-2',
          bonusTotal: 0,
          bonusCount: 0,
          totalPay: 3200000,
        }),
      ]),
    );
  });
});

function buildTransactionClient(overrides?: {
  currentPayroll?: {
    id: string;
    year: number;
    month: number;
    status: 'DRAFT' | 'FINALIZED';
  };
  groupedBonuses?: Array<{
    employeeId: string;
    _sum: { amount: number | null };
    _count: number;
  }>;
}) {
  const currentPayroll =
    overrides?.currentPayroll ??
    ({ id: 'payroll-2026-05', year: 2026, month: 5, status: 'DRAFT' } as const);
  const groupedBonuses = overrides?.groupedBonuses ?? [
    { employeeId: 'employee-1', _sum: { amount: 150000 }, _count: 1 },
    { employeeId: 'employee-2', _sum: { amount: 90000 }, _count: 1 },
  ];
  const createMany = jest
    .fn<
      Promise<Prisma.BatchPayload>,
      [Prisma.EmployeeMonthlyPayrollLineCreateManyArgs]
    >()
    .mockResolvedValue({ count: 2 });

  return {
    employeeMonthlyPayroll: {
      upsert: jest.fn().mockResolvedValue(currentPayroll),
      update: jest
        .fn()
        .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...currentPayroll, ...data }),
        ),
    },
    employeeMonthlyPayrollLine: {
      deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      createMany,
      findMany: jest
        .fn()
        .mockImplementation(({ where }: { where: { payrollId: string } }) =>
          Promise.resolve([
            {
              id: 'line-1',
              payrollId: where.payrollId,
              employeeId: 'employee-1',
              employeeName: 'Ana Torres',
              employeeType: EmployeeType.MECHANIC,
              costCenterId: 'cost-center-general',
              costCenterCode: 'GENERAL',
              costCenterName: 'General',
              baseSalaryMonthlySnapshot: 2500000,
              bonusTotal:
                groupedBonuses.find(
                  (bonus) => bonus.employeeId === 'employee-1',
                )?._sum.amount ?? 0,
              bonusCount:
                groupedBonuses.find(
                  (bonus) => bonus.employeeId === 'employee-1',
                )?._count ?? 0,
              totalPay:
                2500000 +
                (groupedBonuses.find(
                  (bonus) => bonus.employeeId === 'employee-1',
                )?._sum.amount ?? 0),
              createdAt: new Date('2026-05-31T12:00:00.000Z'),
              updatedAt: new Date('2026-05-31T12:00:00.000Z'),
            },
            {
              id: 'line-2',
              payrollId: where.payrollId,
              employeeId: 'employee-2',
              employeeName: 'Mario Rincon',
              employeeType: EmployeeType.ADMIN,
              costCenterId: 'cost-center-oficina',
              costCenterCode: 'OFICINA',
              costCenterName: 'Oficina',
              baseSalaryMonthlySnapshot: 3200000,
              bonusTotal:
                groupedBonuses.find(
                  (bonus) => bonus.employeeId === 'employee-2',
                )?._sum.amount ?? 0,
              bonusCount:
                groupedBonuses.find(
                  (bonus) => bonus.employeeId === 'employee-2',
                )?._count ?? 0,
              totalPay:
                3200000 +
                (groupedBonuses.find(
                  (bonus) => bonus.employeeId === 'employee-2',
                )?._sum.amount ?? 0),
              createdAt: new Date('2026-05-31T12:00:00.000Z'),
              updatedAt: new Date('2026-05-31T12:00:00.000Z'),
            },
          ]),
        ),
    },
    employee: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'employee-1',
          name: 'Ana Torres',
          type: EmployeeType.MECHANIC,
          baseSalaryMonthly: 2500000,
          costCenterId: 'cost-center-general',
          CostCenter: {
            id: 'cost-center-general',
            code: 'GENERAL',
            name: 'General',
          },
        },
        {
          id: 'employee-2',
          name: 'Mario Rincon',
          type: EmployeeType.ADMIN,
          baseSalaryMonthly: 3200000,
          costCenterId: 'cost-center-oficina',
          CostCenter: {
            id: 'cost-center-oficina',
            code: 'OFICINA',
            name: 'Oficina',
          },
        },
      ]),
    },
    employeeBonus: {
      groupBy: jest.fn().mockResolvedValue(groupedBonuses),
    },
  };
}

void EMPLOYEE_MONTHLY_PAYROLL_PRISMA_CLIENT;
