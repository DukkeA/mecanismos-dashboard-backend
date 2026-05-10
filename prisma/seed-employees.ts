import type { CostCenter, Prisma } from '../generated/prisma/client';
import { EmployeeType, PaymentMethod } from '../generated/prisma/enums';

const SEED_EMPLOYEES = [
  {
    id: 'seed-employee-ana-torres',
    name: 'Ana Torres',
    type: EmployeeType.MECHANIC,
    phone: '3001234567',
    baseSalaryMonthly: 2500000,
    costCenterCode: 'GENERAL',
    isActive: true,
  },
  {
    id: 'seed-employee-mario-rincon',
    name: 'Mario Rincon',
    type: EmployeeType.ADMIN,
    phone: '3105557788',
    baseSalaryMonthly: 3200000,
    costCenterCode: 'OFICINA',
    isActive: true,
  },
] as const;

const SEED_EMPLOYEE_BONUSES = [
  {
    id: 'seed-employee-bonus-ana-april',
    employeeId: 'seed-employee-ana-torres',
    amount: 150000,
    description: 'Bono trimestral de productividad',
    paidAt: new Date('2026-04-30T15:00:00.000Z'),
    paymentMethod: PaymentMethod.TRANSFER,
  },
  {
    id: 'seed-employee-bonus-mario-may',
    employeeId: 'seed-employee-mario-rincon',
    amount: 90000,
    description: 'Bono operativo de cierre mensual',
    paidAt: new Date('2026-05-05T17:00:00.000Z'),
    paymentMethod: PaymentMethod.CASH,
  },
] as const;

export type EmployeeSeedPrismaClient = {
  costCenter: {
    findUnique(
      args: Prisma.CostCenterFindUniqueArgs,
    ): Promise<Pick<CostCenter, 'id'> | null>;
  };
  employee: {
    upsert(args: Prisma.EmployeeUpsertArgs): Promise<unknown>;
  };
  employeeBonus: {
    upsert(args: Prisma.EmployeeBonusUpsertArgs): Promise<unknown>;
  };
};

export async function seedEmployeesAndBonuses(
  prisma: EmployeeSeedPrismaClient,
  now: Date,
) {
  const costCenterIds = await resolveCostCenterIds(prisma);

  for (const seedEmployee of SEED_EMPLOYEES) {
    const costCenterId = costCenterIds.get(seedEmployee.costCenterCode);

    await prisma.employee.upsert({
      where: { id: seedEmployee.id },
      create: {
        id: seedEmployee.id,
        name: seedEmployee.name,
        type: seedEmployee.type,
        phone: seedEmployee.phone,
        baseSalaryMonthly: seedEmployee.baseSalaryMonthly,
        isActive: seedEmployee.isActive,
        CostCenter: { connect: { id: costCenterId } },
        createdAt: now,
        updatedAt: now,
      },
      update: {
        name: seedEmployee.name,
        type: seedEmployee.type,
        phone: seedEmployee.phone,
        baseSalaryMonthly: seedEmployee.baseSalaryMonthly,
        isActive: seedEmployee.isActive,
        CostCenter: { connect: { id: costCenterId } },
        updatedAt: now,
      },
    });
  }

  for (const seedBonus of SEED_EMPLOYEE_BONUSES) {
    await prisma.employeeBonus.upsert({
      where: { id: seedBonus.id },
      create: {
        id: seedBonus.id,
        Employee: { connect: { id: seedBonus.employeeId } },
        amount: seedBonus.amount,
        description: seedBonus.description,
        paidAt: seedBonus.paidAt,
        paymentMethod: seedBonus.paymentMethod,
        createdAt: now,
        updatedAt: now,
      },
      update: {
        Employee: { connect: { id: seedBonus.employeeId } },
        amount: seedBonus.amount,
        description: seedBonus.description,
        paidAt: seedBonus.paidAt,
        paymentMethod: seedBonus.paymentMethod,
        updatedAt: now,
      },
    });
  }
}

async function resolveCostCenterIds(prisma: EmployeeSeedPrismaClient) {
  const costCenterIds = new Map<string, string>();

  for (const costCenterCode of uniqueCostCenterCodes()) {
    const costCenter = await prisma.costCenter.findUnique({
      where: { code: costCenterCode },
    });

    if (!costCenter) {
      throw new Error(
        `Cost center ${costCenterCode} must exist before employee seeds`,
      );
    }

    costCenterIds.set(costCenterCode, costCenter.id);
  }

  return costCenterIds;
}

function uniqueCostCenterCodes() {
  return [
    ...new Set(SEED_EMPLOYEES.map((employee) => employee.costCenterCode)),
  ];
}
