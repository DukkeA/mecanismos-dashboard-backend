import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  CostCenter,
  Employee,
  EmployeeMonthlyPayroll,
  EmployeeMonthlyPayrollLine,
  Prisma,
} from '../../generated/prisma/client';
import {
  EmployeeMonthlyPayrollStatus,
  EmployeeType,
} from '../../generated/prisma/enums';

export const EMPLOYEE_MONTHLY_PAYROLL_PRISMA_CLIENT = Symbol(
  'EMPLOYEE_MONTHLY_PAYROLL_PRISMA_CLIENT',
);

const payrollSummarySelect = {
  id: true,
  year: true,
  month: true,
  status: true,
  salaryTotal: true,
  bonusTotal: true,
  grandTotal: true,
  generatedAt: true,
  finalizedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EmployeeMonthlyPayrollSelect;

const payrollDetailInclude = {
  lines: {
    orderBy: { employeeName: 'asc' },
  },
} satisfies Prisma.EmployeeMonthlyPayrollInclude;

type PayrollSummaryRecord = Prisma.EmployeeMonthlyPayrollGetPayload<{
  select: typeof payrollSummarySelect;
}>;

type PayrollDetailRecord = EmployeeMonthlyPayroll & {
  lines: EmployeeMonthlyPayrollLine[];
};

type ActiveEmployeeSnapshotRecord = Pick<
  Employee,
  'id' | 'name' | 'type' | 'baseSalaryMonthly' | 'costCenterId'
> & {
  CostCenter: Pick<CostCenter, 'id' | 'code' | 'name'> | null;
};

type EmployeeBonusTotalsRecord = {
  employeeId: string;
  _sum: { amount: number | null };
  _count: number;
};

type EmployeeMonthlyPayrollPrismaClient = {
  $transaction<T>(callback: (tx: EmployeeMonthlyPayrollTransactionClient) => Promise<T>): Promise<T>;
  employeeMonthlyPayroll: {
    count(args: Prisma.EmployeeMonthlyPayrollCountArgs): Promise<number>;
    findMany(args: Prisma.EmployeeMonthlyPayrollFindManyArgs): Promise<PayrollSummaryRecord[]>;
    findUnique(args: Prisma.EmployeeMonthlyPayrollFindUniqueArgs): Promise<PayrollDetailRecord | null>;
  };
};

type EmployeeMonthlyPayrollTransactionClient = {
  employeeMonthlyPayroll: {
    upsert(args: Prisma.EmployeeMonthlyPayrollUpsertArgs): Promise<EmployeeMonthlyPayroll>;
    findUnique(args: Prisma.EmployeeMonthlyPayrollFindUniqueArgs): Promise<PayrollDetailRecord | null>;
    update(args: Prisma.EmployeeMonthlyPayrollUpdateArgs): Promise<EmployeeMonthlyPayroll>;
  };
  employeeMonthlyPayrollLine: {
    deleteMany(args: Prisma.EmployeeMonthlyPayrollLineDeleteManyArgs): Promise<Prisma.BatchPayload>;
    createMany(args: Prisma.EmployeeMonthlyPayrollLineCreateManyArgs): Promise<Prisma.BatchPayload>;
    findMany(args: Prisma.EmployeeMonthlyPayrollLineFindManyArgs): Promise<EmployeeMonthlyPayrollLine[]>;
  };
  employee: {
    findMany(args: Prisma.EmployeeFindManyArgs): Promise<ActiveEmployeeSnapshotRecord[]>;
  };
  employeeBonus: {
    groupBy(args: Prisma.EmployeeBonusGroupByArgs): Promise<EmployeeBonusTotalsRecord[]>;
  };
};

export type GenerateEmployeeMonthlyPayrollInput = {
  year: number;
  month: number;
  window: { start: Date; end: Date };
};

export type ListEmployeeMonthlyPayrollQuery = {
  page: number;
  limit: number;
  year?: number;
  status?: EmployeeMonthlyPayrollStatus;
};

export type EmployeeMonthlyPayrollSummaryRecord = PayrollSummaryRecord;
export type EmployeeMonthlyPayrollDetailRecord = PayrollDetailRecord;

@Injectable()
export class EmployeeMonthlyPayrollRepository {
  constructor(
    @Inject(EMPLOYEE_MONTHLY_PAYROLL_PRISMA_CLIENT)
    private readonly prisma: EmployeeMonthlyPayrollPrismaClient,
  ) {}

  async findMany(query: ListEmployeeMonthlyPayrollQuery) {
    const where = buildPayrollWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.employeeMonthlyPayroll.findMany({
        where,
        select: payrollSummarySelect,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.employeeMonthlyPayroll.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  findById(id: string) {
    return this.prisma.employeeMonthlyPayroll.findUnique({
      where: { id },
      include: payrollDetailInclude,
    });
  }

  async generateDraft(input: GenerateEmployeeMonthlyPayrollInput) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const payroll = await tx.employeeMonthlyPayroll.upsert({
        where: {
          year_month: {
            year: input.year,
            month: input.month,
          },
        },
        create: {
          id: randomUUID(),
          year: input.year,
          month: input.month,
          status: EmployeeMonthlyPayrollStatus.DRAFT,
          salaryTotal: 0,
          bonusTotal: 0,
          grandTotal: 0,
          generatedAt: now,
          updatedAt: now,
        },
        update: {
          updatedAt: now,
        },
      });

      if (payroll.status === EmployeeMonthlyPayrollStatus.FINALIZED) {
        throw finalizedConflict(input.year, input.month);
      }

      const [employees, groupedBonuses] = await Promise.all([
        tx.employee.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' },
          include: {
            CostCenter: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        }),
        tx.employeeBonus.groupBy({
          by: ['employeeId'],
          where: {
            paidAt: {
              gte: input.window.start,
              lt: input.window.end,
            },
          },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      const bonusTotalsByEmployeeId = new Map(
        groupedBonuses.map((bonus) => [bonus.employeeId, bonus]),
      );
      const lineData = employees.map((employee) =>
        buildPayrollLineCreateInput(payroll.id, employee, bonusTotalsByEmployeeId, now),
      );

      await tx.employeeMonthlyPayrollLine.deleteMany({
        where: { payrollId: payroll.id },
      });

      if (lineData.length > 0) {
        await tx.employeeMonthlyPayrollLine.createMany({
          data: lineData,
        });
      }

      const totals = calculateRepositoryTotals(lineData);
      const updatedPayroll = await tx.employeeMonthlyPayroll.update({
        where: { id: payroll.id },
        data: {
          status: EmployeeMonthlyPayrollStatus.DRAFT,
          salaryTotal: totals.salaryTotal,
          bonusTotal: totals.bonusTotal,
          grandTotal: totals.grandTotal,
          generatedAt: now,
          finalizedAt: null,
          updatedAt: now,
        },
      });

      return {
        ...updatedPayroll,
        lines: lineData.map(mapCreateLineToRecord),
      } satisfies PayrollDetailRecord;
    });
  }

  async finalizeDraft(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const payroll = await tx.employeeMonthlyPayroll.findUnique({
        where: { id },
        include: payrollDetailInclude,
      });

      if (!payroll) {
        return null;
      }

      if (payroll.status === EmployeeMonthlyPayrollStatus.FINALIZED) {
        throw finalizedConflict(payroll.year, payroll.month);
      }

      const finalizedAt = new Date();
      const updatedPayroll = await tx.employeeMonthlyPayroll.update({
        where: { id },
        data: {
          status: EmployeeMonthlyPayrollStatus.FINALIZED,
          finalizedAt,
          updatedAt: finalizedAt,
        },
      });

      return {
        ...updatedPayroll,
        lines: payroll.lines,
      } satisfies PayrollDetailRecord;
    });
  }
}

function buildPayrollLineCreateInput(
  payrollId: string,
  employee: ActiveEmployeeSnapshotRecord,
  bonusTotalsByEmployeeId: Map<string, EmployeeBonusTotalsRecord>,
  now: Date,
) {
  const employeeBonus = bonusTotalsByEmployeeId.get(employee.id);
  const bonusTotal = employeeBonus?._sum.amount ?? 0;
  const bonusCount = employeeBonus?._count ?? 0;

  return {
    id: randomUUID(),
    payrollId,
    employeeId: employee.id,
    employeeName: employee.name,
    employeeType: employee.type,
    costCenterId: employee.costCenterId ?? null,
    costCenterCode: employee.CostCenter?.code ?? null,
    costCenterName: employee.CostCenter?.name ?? null,
    baseSalaryMonthlySnapshot: employee.baseSalaryMonthly,
    bonusTotal,
    bonusCount,
    totalPay: employee.baseSalaryMonthly + bonusTotal,
    createdAt: now,
    updatedAt: now,
  } satisfies Prisma.EmployeeMonthlyPayrollLineCreateManyInput;
}

function mapCreateLineToRecord(
  line: Prisma.EmployeeMonthlyPayrollLineCreateManyInput,
): EmployeeMonthlyPayrollLine {
  return {
    id: line.id,
    payrollId: line.payrollId,
    employeeId: line.employeeId ?? null,
    employeeName: line.employeeName,
    employeeType: line.employeeType as EmployeeType,
    costCenterId: line.costCenterId ?? null,
    costCenterCode: line.costCenterCode ?? null,
    costCenterName: line.costCenterName ?? null,
    baseSalaryMonthlySnapshot: line.baseSalaryMonthlySnapshot,
    bonusTotal: line.bonusTotal,
    bonusCount: line.bonusCount,
    totalPay: line.totalPay,
    createdAt: line.createdAt ?? new Date(),
    updatedAt: line.updatedAt,
  };
}

function buildPayrollWhere(query: ListEmployeeMonthlyPayrollQuery) {
  return {
    ...(query.year !== undefined ? { year: query.year } : {}),
    ...(query.status !== undefined ? { status: query.status } : {}),
  } satisfies Prisma.EmployeeMonthlyPayrollWhereInput;
}

function calculateRepositoryTotals(
  lines: Prisma.EmployeeMonthlyPayrollLineCreateManyInput[],
) {
  return lines.reduce(
    (totals, line) => ({
      salaryTotal: totals.salaryTotal + line.baseSalaryMonthlySnapshot,
      bonusTotal: totals.bonusTotal + line.bonusTotal,
      grandTotal: totals.grandTotal + line.totalPay,
    }),
    { salaryTotal: 0, bonusTotal: 0, grandTotal: 0 },
  );
}

function finalizedConflict(year: number, month: number) {
  const error = new Error(
    `Payroll period ${year}-${String(month).padStart(2, '0')} is already finalized`,
  );
  error.name = 'EmployeeMonthlyPayrollFinalizedConflict';
  return error;
}
