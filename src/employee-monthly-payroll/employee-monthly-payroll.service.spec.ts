import { ConflictException, NotFoundException } from '@nestjs/common';
import { EmployeeType } from '../../generated/prisma/enums';
import {
  EmployeeMonthlyPayrollService,
  buildPayrollUtcMonthWindow,
  calculatePayrollTotals,
} from './employee-monthly-payroll.service';
import { EmployeeMonthlyPayrollRepository } from './employee-monthly-payroll.repository';

type PayrollLineRecord = {
  id: string;
  payrollId: string;
  employeeId: string | null;
  employeeName: string;
  employeeType: EmployeeType;
  costCenterId: string | null;
  costCenterCode: string | null;
  costCenterName: string | null;
  baseSalaryMonthlySnapshot: number;
  bonusTotal: number;
  bonusCount: number;
  totalPay: number;
  createdAt: Date;
  updatedAt: Date;
};

type PayrollRecord = {
  id: string;
  year: number;
  month: number;
  status: 'DRAFT' | 'FINALIZED';
  salaryTotal: number;
  bonusTotal: number;
  grandTotal: number;
  generatedAt: Date;
  finalizedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lines?: PayrollLineRecord[];
};

describe('EmployeeMonthlyPayrollService', () => {
  const repository = {
    generateDraft: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    finalizeDraft: jest.fn(),
  } as unknown as jest.Mocked<EmployeeMonthlyPayrollRepository>;

  let service: EmployeeMonthlyPayrollService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmployeeMonthlyPayrollService(repository);
  });

  it('builds a UTC month window with an exclusive end boundary', () => {
    expect(buildPayrollUtcMonthWindow(2026, 5)).toEqual({
      start: new Date('2026-05-01T00:00:00.000Z'),
      end: new Date('2026-06-01T00:00:00.000Z'),
    });

    expect(buildPayrollUtcMonthWindow(2026, 12)).toEqual({
      start: new Date('2026-12-01T00:00:00.000Z'),
      end: new Date('2027-01-01T00:00:00.000Z'),
    });
  });

  it('calculates salary, bonus, and grand totals from generated lines', () => {
    expect(
      calculatePayrollTotals([
        {
          baseSalaryMonthlySnapshot: 2500000,
          bonusTotal: 150000,
          totalPay: 2650000,
        },
        {
          baseSalaryMonthlySnapshot: 3200000,
          bonusTotal: 90000,
          totalPay: 3290000,
        },
      ]),
    ).toEqual({
      salaryTotal: 5700000,
      bonusTotal: 240000,
      grandTotal: 5940000,
    });
  });

  it('generates a new draft for a valid period and reuses the same period when regenerating', async () => {
    const generatedDraft = buildPayrollRecord({
      id: 'payroll-2026-05',
      year: 2026,
      month: 5,
      status: 'DRAFT',
      salaryTotal: 5700000,
      bonusTotal: 240000,
      grandTotal: 5940000,
    });

    repository.generateDraft.mockResolvedValue(generatedDraft);

    await expect(service.generate({ year: 2026, month: 5 })).resolves.toEqual(
      generatedDraft,
    );
    await expect(service.generate({ year: 2026, month: 5 })).resolves.toEqual(
      generatedDraft,
    );

    expect(repository.generateDraft).toHaveBeenCalledTimes(2);
    expect(repository.generateDraft.mock.calls[0]?.[0]).toEqual({
      year: 2026,
      month: 5,
      window: {
        start: new Date('2026-05-01T00:00:00.000Z'),
        end: new Date('2026-06-01T00:00:00.000Z'),
      },
    });
    expect(repository.generateDraft.mock.calls[1]?.[0]).toEqual(
      repository.generateDraft.mock.calls[0]?.[0],
    );
  });

  it('rejects regeneration when the target period is already finalized', async () => {
    repository.generateDraft.mockRejectedValue(
      new ConflictException('Payroll period 2026-05 is already finalized'),
    );

    await expect(service.generate({ year: 2026, month: 5 })).rejects.toThrow(
      new ConflictException('Payroll period 2026-05 is already finalized'),
    );
  });

  it('finalizes an existing draft and rejects missing payroll ids', async () => {
    const finalized = buildPayrollRecord({
      id: 'payroll-2026-05',
      status: 'FINALIZED',
      finalizedAt: new Date('2026-05-31T23:59:59.000Z'),
    });

    repository.finalizeDraft.mockResolvedValueOnce(finalized);
    repository.finalizeDraft.mockRejectedValueOnce(
      new NotFoundException('Employee monthly payroll missing-payroll not found'),
    );

    await expect(service.finalize('payroll-2026-05')).resolves.toEqual(finalized);
    await expect(service.finalize('missing-payroll')).rejects.toThrow(
      new NotFoundException('Employee monthly payroll missing-payroll not found'),
    );
  });
});

function buildPayrollRecord(
  overrides: Partial<PayrollRecord> = {},
): PayrollRecord {
  return {
    id: 'payroll-1',
    year: 2026,
    month: 5,
    status: 'DRAFT',
    salaryTotal: 0,
    bonusTotal: 0,
    grandTotal: 0,
    generatedAt: new Date('2026-05-31T12:00:00.000Z'),
    finalizedAt: null,
    createdAt: new Date('2026-05-31T12:00:00.000Z'),
    updatedAt: new Date('2026-05-31T12:00:00.000Z'),
    lines: [],
    ...overrides,
  };
}
