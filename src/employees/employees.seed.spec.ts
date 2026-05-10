import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Prisma } from '../../generated/prisma/client';
import {
  type EmployeeSeedPrismaClient,
  seedEmployeesAndBonuses,
} from '../../prisma/seed-employees';

type CostCenterFindUniqueArgs = Prisma.CostCenterFindUniqueArgs;
type EmployeeUpsertArgs = Prisma.EmployeeUpsertArgs;
type EmployeeBonusUpsertArgs = Prisma.EmployeeBonusUpsertArgs;

void (seedEmployeesAndBonuses satisfies (
  prisma: EmployeeSeedPrismaClient,
  now: Date,
) => Promise<void>);

describe('employee seeds', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const prismaSeedPath = path.join(projectRoot, 'prisma', 'seed.ts');

  it('upserts stable employees after resolving seeded cost centers by canonical code', async () => {
    const findUnique = jest
      .fn<Promise<{ id: string } | null>, [CostCenterFindUniqueArgs]>()
      .mockImplementation(({ where }) => {
        if (where.code === 'GENERAL') {
          return Promise.resolve({ id: 'cost-center-general' });
        }

        if (where.code === 'OFICINA') {
          return Promise.resolve({ id: 'cost-center-oficina' });
        }

        return Promise.resolve(null);
      });
    const employeeUpsert = jest
      .fn<Promise<unknown>, [EmployeeUpsertArgs]>()
      .mockResolvedValue(undefined);
    const employeeBonusUpsert = jest
      .fn<Promise<unknown>, [EmployeeBonusUpsertArgs]>()
      .mockResolvedValue(undefined);

    await seedEmployeesAndBonuses(
      {
        costCenter: { findUnique },
        employee: { upsert: employeeUpsert },
        employeeBonus: { upsert: employeeBonusUpsert },
      },
      new Date('2026-05-10T12:00:00.000Z'),
    );

    expect(findUnique).toHaveBeenCalledWith({ where: { code: 'GENERAL' } });
    expect(findUnique).toHaveBeenCalledWith({ where: { code: 'OFICINA' } });
    expect(employeeUpsert).toHaveBeenCalledTimes(2);
    expect(employeeUpsert.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'seed-employee-ana-torres' },
      create: {
        id: 'seed-employee-ana-torres',
        name: 'Ana Torres',
        CostCenter: { connect: { id: 'cost-center-general' } },
      },
      update: {
        name: 'Ana Torres',
        CostCenter: { connect: { id: 'cost-center-general' } },
      },
    });
    expect(employeeUpsert.mock.calls[1]?.[0]).toMatchObject({
      where: { id: 'seed-employee-mario-rincon' },
      create: {
        id: 'seed-employee-mario-rincon',
        CostCenter: { connect: { id: 'cost-center-oficina' } },
      },
    });
  });

  it('upserts stable employee bonuses owned by the seeded employees', async () => {
    const employeeUpsert = jest
      .fn<Promise<unknown>, [EmployeeUpsertArgs]>()
      .mockResolvedValue(undefined);
    const employeeBonusUpsert = jest
      .fn<Promise<unknown>, [EmployeeBonusUpsertArgs]>()
      .mockResolvedValue(undefined);

    await seedEmployeesAndBonuses(
      {
        costCenter: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'cost-center-general' }),
        },
        employee: { upsert: employeeUpsert },
        employeeBonus: { upsert: employeeBonusUpsert },
      },
      new Date('2026-05-10T12:00:00.000Z'),
    );

    expect(employeeBonusUpsert).toHaveBeenCalledTimes(2);
    expect(employeeBonusUpsert.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'seed-employee-bonus-ana-april' },
      create: {
        id: 'seed-employee-bonus-ana-april',
        Employee: { connect: { id: 'seed-employee-ana-torres' } },
        amount: 150000,
      },
      update: {
        Employee: { connect: { id: 'seed-employee-ana-torres' } },
        amount: 150000,
      },
    });
    expect(employeeBonusUpsert.mock.calls[1]?.[0]).toMatchObject({
      where: { id: 'seed-employee-bonus-mario-may' },
      create: {
        Employee: { connect: { id: 'seed-employee-mario-rincon' } },
      },
    });
  });

  it('hooks employee seeds into prisma/seed.ts after the default cost centers', () => {
    const seedSource = fs.readFileSync(prismaSeedPath, 'utf8');

    expect(seedSource).toContain(
      "import { seedEmployeesAndBonuses } from './seed-employees';",
    );
    expect(
      seedSource.indexOf('await seedDefaultCostCenters(prisma, now);'),
    ).toBeLessThan(
      seedSource.indexOf('await seedEmployeesAndBonuses(prisma, now);'),
    );
  });
});
