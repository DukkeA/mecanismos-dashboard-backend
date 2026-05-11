import type { Prisma } from '../generated/prisma/client';
import {
  EmployeeMonthlyPayrollStatus,
  EmployeeType,
} from '../generated/prisma/enums';

const SEED_PAYROLLS = [
  {
    id: 'seed-payroll-2026-04-finalized',
    year: 2026,
    month: 4,
    status: EmployeeMonthlyPayrollStatus.FINALIZED,
    generatedAt: new Date('2026-04-30T18:00:00.000Z'),
    finalizedAt: new Date('2026-04-30T23:00:00.000Z'),
    lines: [
      {
        id: 'seed-payroll-line-2026-04-ana',
        employeeId: 'seed-employee-ana-torres',
        employeeName: 'Ana Torres',
        employeeType: EmployeeType.MECHANIC,
        costCenterCode: 'GENERAL',
        baseSalaryMonthlySnapshot: 2500000,
        bonusTotal: 150000,
        bonusCount: 1,
      },
      {
        id: 'seed-payroll-line-2026-04-mario',
        employeeId: 'seed-employee-mario-rincon',
        employeeName: 'Mario Rincon',
        employeeType: EmployeeType.ADMIN,
        costCenterCode: 'OFICINA',
        baseSalaryMonthlySnapshot: 3200000,
        bonusTotal: 0,
        bonusCount: 0,
      },
    ],
  },
  {
    id: 'seed-payroll-2026-06-draft',
    year: 2026,
    month: 6,
    status: EmployeeMonthlyPayrollStatus.DRAFT,
    generatedAt: new Date('2026-06-30T18:00:00.000Z'),
    finalizedAt: null,
    lines: [
      {
        id: 'seed-payroll-line-2026-06-ana',
        employeeId: 'seed-employee-ana-torres',
        employeeName: 'Ana Torres',
        employeeType: EmployeeType.MECHANIC,
        costCenterCode: 'GENERAL',
        baseSalaryMonthlySnapshot: 2500000,
        bonusTotal: 0,
        bonusCount: 0,
      },
      {
        id: 'seed-payroll-line-2026-06-mario',
        employeeId: 'seed-employee-mario-rincon',
        employeeName: 'Mario Rincon',
        employeeType: EmployeeType.ADMIN,
        costCenterCode: 'OFICINA',
        baseSalaryMonthlySnapshot: 3200000,
        bonusTotal: 0,
        bonusCount: 0,
      },
    ],
  },
] as const;

export type EmployeeMonthlyPayrollSeedPrismaClient = {
  costCenter: {
    findUnique(
      args: Prisma.CostCenterFindUniqueArgs,
    ): Promise<{ id: string } | null>;
  };
  employeeMonthlyPayroll: {
    upsert(args: Prisma.EmployeeMonthlyPayrollUpsertArgs): Promise<unknown>;
  };
  employeeMonthlyPayrollLine: {
    deleteMany(
      args: Prisma.EmployeeMonthlyPayrollLineDeleteManyArgs,
    ): Promise<unknown>;
    createMany(
      args: Prisma.EmployeeMonthlyPayrollLineCreateManyArgs,
    ): Promise<unknown>;
  };
};

export async function seedEmployeeMonthlyPayroll(
  prisma: EmployeeMonthlyPayrollSeedPrismaClient,
  now: Date,
) {
  const costCenterIds = await resolveCostCenterIds(prisma);

  for (const payroll of SEED_PAYROLLS) {
    const totals = calculateSeedPayrollTotals(payroll.lines);

    await prisma.employeeMonthlyPayroll.upsert({
      where: { year_month: { year: payroll.year, month: payroll.month } },
      create: {
        id: payroll.id,
        year: payroll.year,
        month: payroll.month,
        status: payroll.status,
        salaryTotal: totals.salaryTotal,
        bonusTotal: totals.bonusTotal,
        grandTotal: totals.grandTotal,
        generatedAt: payroll.generatedAt,
        finalizedAt: payroll.finalizedAt,
        createdAt: now,
        updatedAt: now,
      },
      update: {
        status: payroll.status,
        salaryTotal: totals.salaryTotal,
        bonusTotal: totals.bonusTotal,
        grandTotal: totals.grandTotal,
        generatedAt: payroll.generatedAt,
        finalizedAt: payroll.finalizedAt,
        updatedAt: now,
      },
    });
  }

  await prisma.employeeMonthlyPayrollLine.deleteMany({
    where: {
      payrollId: { in: SEED_PAYROLLS.map((payroll) => payroll.id) },
    },
  });

  await prisma.employeeMonthlyPayrollLine.createMany({
    data: SEED_PAYROLLS.flatMap((payroll) =>
      payroll.lines.map((line) => ({
        id: line.id,
        payrollId: payroll.id,
        employeeId: line.employeeId,
        employeeName: line.employeeName,
        employeeType: line.employeeType,
        costCenterId: costCenterIds.get(line.costCenterCode) ?? null,
        costCenterCode: line.costCenterCode,
        costCenterName:
          line.costCenterCode === 'GENERAL' ? 'General' : 'Oficina',
        baseSalaryMonthlySnapshot: line.baseSalaryMonthlySnapshot,
        bonusTotal: line.bonusTotal,
        bonusCount: line.bonusCount,
        totalPay: line.baseSalaryMonthlySnapshot + line.bonusTotal,
        createdAt: now,
        updatedAt: now,
      })),
    ),
  });
}

async function resolveCostCenterIds(prisma: EmployeeMonthlyPayrollSeedPrismaClient) {
  const costCenterIds = new Map<string, string>();

  for (const code of ['GENERAL', 'OFICINA'] as const) {
    const costCenter = await prisma.costCenter.findUnique({
      where: { code },
    });

    if (!costCenter) {
      throw new Error(
        `Cost center ${code} must exist before employee monthly payroll seeds`,
      );
    }

    costCenterIds.set(code, costCenter.id);
  }

  return costCenterIds;
}

function calculateSeedPayrollTotals(
  lines: readonly {
    baseSalaryMonthlySnapshot: number;
    bonusTotal: number;
  }[],
) {
  return lines.reduce(
    (totals, line) => ({
      salaryTotal: totals.salaryTotal + line.baseSalaryMonthlySnapshot,
      bonusTotal: totals.bonusTotal + line.bonusTotal,
      grandTotal:
        totals.grandTotal + line.baseSalaryMonthlySnapshot + line.bonusTotal,
    }),
    { salaryTotal: 0, bonusTotal: 0, grandTotal: 0 },
  );
}
