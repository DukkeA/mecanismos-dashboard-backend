import type { CostCenter, Expense, Prisma } from '../generated/prisma/client';
import { ExpenseCategory, PaymentMethod } from '../generated/prisma/enums';

const SEED_EXPENSES = [
  {
    id: 'seed-expense-rent-may',
    name: 'Arriendo sede mayo',
    category: ExpenseCategory.RENT,
    amount: 1500000,
    expectedAt: new Date('2026-05-15T00:00:00.000Z'),
    paidAt: null,
    paymentMethod: null,
    costCenterCode: 'OFICINA',
    notes: 'Canon mensual programado para oficina principal.',
  },
  {
    id: 'seed-expense-utility-power-april',
    name: 'Factura energía abril',
    category: ExpenseCategory.UTILITY,
    amount: 420000,
    expectedAt: new Date('2026-04-25T00:00:00.000Z'),
    paidAt: new Date('2026-04-26T14:30:00.000Z'),
    paymentMethod: PaymentMethod.TRANSFER,
    costCenterCode: 'GENERAL',
    notes: 'Servicio público pagado desde tesorería general.',
  },
  {
    id: 'seed-expense-other-courier',
    name: 'Mensajería documentos cámara de comercio',
    category: ExpenseCategory.OTHER,
    amount: 38000,
    expectedAt: new Date('2026-05-08T00:00:00.000Z'),
    paidAt: new Date('2026-05-08T16:00:00.000Z'),
    paymentMethod: PaymentMethod.CASH,
    costCenterCode: null,
    notes: 'Gasto menor operativo sin centro de costo asociado.',
  },
] as const;

function lexicalNote(text: string) {
  return {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', text }],
        },
      ],
    },
  };
}

export type ExpenseSeedPrismaClient = {
  costCenter: {
    findUnique(
      args: Prisma.CostCenterFindUniqueArgs,
    ): Promise<Pick<CostCenter, 'id'> | null>;
  };
  expense: {
    upsert(args: Prisma.ExpenseUpsertArgs): Promise<Expense>;
  };
};

export async function seedExpenses(prisma: ExpenseSeedPrismaClient, now: Date) {
  const costCenterIds = await resolveCostCenterIds(prisma);

  for (const seedExpense of SEED_EXPENSES) {
    const costCenterId = seedExpense.costCenterCode
      ? (costCenterIds.get(seedExpense.costCenterCode) ?? null)
      : null;

    await prisma.expense.upsert({
      where: { id: seedExpense.id },
      create: {
        id: seedExpense.id,
        name: seedExpense.name,
        category: seedExpense.category,
        amount: seedExpense.amount,
        expectedAt: seedExpense.expectedAt,
        paidAt: seedExpense.paidAt,
        paymentMethod: seedExpense.paymentMethod,
        costCenterId,
        notes: lexicalNote(seedExpense.notes),
        createdAt: now,
        updatedAt: now,
      },
      update: {
        name: seedExpense.name,
        category: seedExpense.category,
        amount: seedExpense.amount,
        expectedAt: seedExpense.expectedAt,
        paidAt: seedExpense.paidAt,
        paymentMethod: seedExpense.paymentMethod,
        costCenterId,
        notes: lexicalNote(seedExpense.notes),
        updatedAt: now,
      },
    });
  }
}

async function resolveCostCenterIds(prisma: ExpenseSeedPrismaClient) {
  const costCenterIds = new Map<string, string>();

  for (const costCenterCode of uniqueCostCenterCodes()) {
    const costCenter = await prisma.costCenter.findUnique({
      where: { code: costCenterCode },
    });

    if (!costCenter) {
      throw new Error(
        `Cost center ${costCenterCode} must exist before expense seeds`,
      );
    }

    costCenterIds.set(costCenterCode, costCenter.id);
  }

  return costCenterIds;
}

function uniqueCostCenterCodes() {
  return [
    ...new Set(
      SEED_EXPENSES.flatMap((expense) =>
        expense.costCenterCode ? [expense.costCenterCode] : [],
      ),
    ),
  ];
}
