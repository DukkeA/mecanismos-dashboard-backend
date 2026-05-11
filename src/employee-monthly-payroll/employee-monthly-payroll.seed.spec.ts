import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Prisma } from '../../generated/prisma/client';
import {
  type EmployeeMonthlyPayrollSeedPrismaClient,
  seedEmployeeMonthlyPayroll,
} from '../../prisma/seed-employee-monthly-payroll';

type CostCenterFindUniqueArgs = Prisma.CostCenterFindUniqueArgs;
type EmployeeMonthlyPayrollUpsertArgs = Prisma.EmployeeMonthlyPayrollUpsertArgs;
type EmployeeMonthlyPayrollLineDeleteManyArgs =
  Prisma.EmployeeMonthlyPayrollLineDeleteManyArgs;
type EmployeeMonthlyPayrollLineCreateManyArgs =
  Prisma.EmployeeMonthlyPayrollLineCreateManyArgs;

void (seedEmployeeMonthlyPayroll satisfies (
  prisma: EmployeeMonthlyPayrollSeedPrismaClient,
  now: Date,
) => Promise<void>);

describe('employee monthly payroll seeds', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const prismaSeedPath = path.join(projectRoot, 'prisma', 'seed.ts');

  it('upserts stable finalized and draft payroll headers after resolving seeded cost centers', async () => {
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
    const payrollUpsert = jest
      .fn<Promise<unknown>, [EmployeeMonthlyPayrollUpsertArgs]>()
      .mockResolvedValue(undefined);
    const deleteMany = jest
      .fn<Promise<unknown>, [EmployeeMonthlyPayrollLineDeleteManyArgs]>()
      .mockResolvedValue({ count: 0 });
    const createMany = jest
      .fn<Promise<unknown>, [EmployeeMonthlyPayrollLineCreateManyArgs]>()
      .mockResolvedValue({ count: 4 });

    await seedEmployeeMonthlyPayroll(
      {
        costCenter: { findUnique },
        employeeMonthlyPayroll: { upsert: payrollUpsert },
        employeeMonthlyPayrollLine: { deleteMany, createMany },
      },
      new Date('2026-05-11T12:00:00.000Z'),
    );

    expect(payrollUpsert).toHaveBeenCalledTimes(2);
    expect(payrollUpsert.mock.calls[0]?.[0]).toMatchObject({
      where: { year_month: { year: 2026, month: 4 } },
      create: {
        id: 'seed-payroll-2026-04-finalized',
        status: 'FINALIZED',
      },
    });
    expect(payrollUpsert.mock.calls[1]?.[0]).toMatchObject({
      where: { year_month: { year: 2026, month: 6 } },
      create: {
        id: 'seed-payroll-2026-06-draft',
        status: 'DRAFT',
      },
    });
    expect(findUnique).toHaveBeenCalledWith({ where: { code: 'GENERAL' } });
    expect(findUnique).toHaveBeenCalledWith({ where: { code: 'OFICINA' } });
  });

  it('replaces stable line snapshots for the seeded payroll periods', async () => {
    let capturedCreateManyArgs:
      | EmployeeMonthlyPayrollLineCreateManyArgs
      | undefined;
    const findUnique = jest
      .fn<Promise<{ id: string } | null>, [CostCenterFindUniqueArgs]>()
      .mockImplementation(({ where }) =>
        Promise.resolve(
          where.code === 'GENERAL'
            ? { id: 'cost-center-general' }
            : { id: 'cost-center-oficina' },
        ),
      );
    const payrollUpsert = jest
      .fn<Promise<unknown>, [EmployeeMonthlyPayrollUpsertArgs]>()
      .mockResolvedValue(undefined);
    const deleteMany = jest
      .fn<Promise<unknown>, [EmployeeMonthlyPayrollLineDeleteManyArgs]>()
      .mockResolvedValue({ count: 0 });
    const createMany = jest
      .fn<Promise<unknown>, [EmployeeMonthlyPayrollLineCreateManyArgs]>()
      .mockImplementation((args) => {
        capturedCreateManyArgs = args;
        return Promise.resolve({ count: 4 });
      });

    await seedEmployeeMonthlyPayroll(
      {
        costCenter: { findUnique },
        employeeMonthlyPayroll: {
          upsert: payrollUpsert,
        },
        employeeMonthlyPayrollLine: { deleteMany, createMany },
      },
      new Date('2026-05-11T12:00:00.000Z'),
    );

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        payrollId: {
          in: ['seed-payroll-2026-04-finalized', 'seed-payroll-2026-06-draft'],
        },
      },
    });
    const seededLines = capturedCreateManyArgs?.data ?? [];

    expect(seededLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'seed-payroll-line-2026-04-ana',
          payrollId: 'seed-payroll-2026-04-finalized',
          employeeName: 'Ana Torres',
          bonusTotal: 150000,
        }),
        expect.objectContaining({
          id: 'seed-payroll-line-2026-06-mario',
          payrollId: 'seed-payroll-2026-06-draft',
          employeeName: 'Mario Rincon',
          bonusTotal: 0,
        }),
      ]),
    );
  });

  it('hooks payroll seeds into prisma/seed.ts after employee bonuses', () => {
    const seedSource = fs.readFileSync(prismaSeedPath, 'utf8');

    expect(seedSource).toContain(
      "import { seedEmployeeMonthlyPayroll } from './seed-employee-monthly-payroll';",
    );
    expect(
      seedSource.indexOf('await seedEmployeesAndBonuses(prisma, now);'),
    ).toBeLessThan(
      seedSource.indexOf('await seedEmployeeMonthlyPayroll(prisma, now);'),
    );
  });
});
