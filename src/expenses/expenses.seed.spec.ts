import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  CostCenter,
  Expense,
  Prisma,
} from '../../generated/prisma/client';
import { ExpenseCategory, PaymentMethod } from '../../generated/prisma/enums';
import {
  type ExpenseSeedPrismaClient,
  seedExpenses,
} from '../../prisma/seed-expenses';

type CostCenterFindUniqueArgs = Prisma.CostCenterFindUniqueArgs;
type ExpenseUpsertArgs = Prisma.ExpenseUpsertArgs;

void (seedExpenses satisfies (
  prisma: ExpenseSeedPrismaClient,
  now: Date,
) => Promise<void>);

describe('expense seeds', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const prismaSeedPath = path.join(projectRoot, 'prisma', 'seed.ts');

  it('upserts stable paid and unpaid expenses after resolving seeded cost centers by canonical code', async () => {
    const findUnique = jest
      .fn<Promise<Pick<CostCenter, 'id'> | null>, [CostCenterFindUniqueArgs]>()
      .mockImplementation(({ where }) => {
        if (where.code === 'GENERAL') {
          return Promise.resolve({ id: 'cost-center-general' });
        }

        if (where.code === 'OFICINA') {
          return Promise.resolve({ id: 'cost-center-oficina' });
        }

        return Promise.resolve(null);
      });
    const expenseUpsert = jest
      .fn<Promise<Expense>, [ExpenseUpsertArgs]>()
      .mockResolvedValue({} as Expense);

    await seedExpenses(
      {
        costCenter: { findUnique },
        expense: { upsert: expenseUpsert },
      },
      new Date('2026-05-10T12:00:00.000Z'),
    );

    expect(findUnique).toHaveBeenCalledWith({ where: { code: 'GENERAL' } });
    expect(findUnique).toHaveBeenCalledWith({ where: { code: 'OFICINA' } });
    expect(expenseUpsert).toHaveBeenCalledTimes(3);
    expect(expenseUpsert.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'seed-expense-rent-may' },
      create: {
        id: 'seed-expense-rent-may',
        category: ExpenseCategory.RENT,
        costCenterId: 'cost-center-oficina',
        paymentMethod: null,
      },
      update: {
        category: ExpenseCategory.RENT,
        costCenterId: 'cost-center-oficina',
        paymentMethod: null,
      },
    });
    expect(expenseUpsert.mock.calls[1]?.[0]).toMatchObject({
      where: { id: 'seed-expense-utility-power-april' },
      create: {
        category: ExpenseCategory.UTILITY,
        costCenterId: 'cost-center-general',
        paymentMethod: PaymentMethod.TRANSFER,
      },
    });
    expect(expenseUpsert.mock.calls[2]?.[0]).toMatchObject({
      where: { id: 'seed-expense-other-courier' },
      create: {
        category: ExpenseCategory.OTHER,
        costCenterId: null,
        paymentMethod: PaymentMethod.CASH,
      },
    });
  });

  it('fails fast when a referenced seeded cost center code is missing', async () => {
    const expenseUpsert = jest
      .fn<Promise<Expense>, [ExpenseUpsertArgs]>()
      .mockResolvedValue({} as Expense);

    await expect(
      seedExpenses(
        {
          costCenter: {
            findUnique: jest
              .fn<
                Promise<Pick<CostCenter, 'id'> | null>,
                [CostCenterFindUniqueArgs]
              >()
              .mockImplementation(({ where }) => {
                if (where.code === 'GENERAL') {
                  return Promise.resolve({ id: 'cost-center-general' });
                }

                return Promise.resolve(null);
              }),
          },
          expense: { upsert: expenseUpsert },
        },
        new Date('2026-05-10T12:00:00.000Z'),
      ),
    ).rejects.toThrow('Cost center OFICINA must exist before expense seeds');

    expect(expenseUpsert).not.toHaveBeenCalled();
  });

  it('hooks expense seeds into prisma/seed.ts after the default cost centers', () => {
    const seedSource = fs.readFileSync(prismaSeedPath, 'utf8');

    expect(seedSource).toContain(
      "import { seedExpenses } from './seed-expenses';",
    );
    expect(
      seedSource.indexOf('await seedDefaultCostCenters(prisma, now);'),
    ).toBeLessThan(seedSource.indexOf('await seedExpenses(prisma, now);'));
  });
});
