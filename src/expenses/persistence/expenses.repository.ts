import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  CostCenter,
  Expense,
  ExpenseCategory,
  PaymentMethod,
  Prisma,
} from '../../../generated/prisma/client';

export const EXPENSES_PRISMA_CLIENT = Symbol('EXPENSES_PRISMA_CLIENT');

export type ExpenseRecord = Expense & {
  CostCenter: CostCenter | null;
};

export type CreateExpenseRecordInput = {
  name: string;
  category: ExpenseCategory;
  amount: number;
  expectedAt: Date;
  costCenterId?: string | null;
  paidAt?: Date | null;
  paymentMethod?: PaymentMethod | null;
  notes?: string | null;
};

export type UpdateExpenseRecordInput = Partial<CreateExpenseRecordInput>;

export type ListExpensesQuery = {
  page: number;
  limit: number;
  search?: string;
  category?: ExpenseCategory;
  costCenterId?: string;
  isPaid?: boolean;
  expectedFrom?: Date;
  expectedTo?: Date;
  paidFrom?: Date;
  paidTo?: Date;
};

type ExpenseWhereInput = Prisma.ExpenseWhereInput;

type ExpensesPrismaClient = {
  expense: {
    create(args: {
      data: Record<string, unknown>;
      include: { CostCenter: true };
    }): Promise<ExpenseRecord>;
    findMany(args: {
      where: ExpenseWhereInput;
      include: { CostCenter: true };
      orderBy: { expectedAt: 'desc' };
      skip: number;
      take: number;
    }): Promise<ExpenseRecord[]>;
    count(args: { where: ExpenseWhereInput }): Promise<number>;
    findUnique(args: {
      where: { id: string };
      include: { CostCenter: true };
    }): Promise<ExpenseRecord | null>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      include: { CostCenter: true };
    }): Promise<ExpenseRecord>;
  };
  costCenter: {
    findUnique(args: { where: { id: string } }): Promise<CostCenter | null>;
  };
};

@Injectable()
export class ExpensesRepository {
  constructor(
    @Inject(EXPENSES_PRISMA_CLIENT)
    private readonly prisma: ExpensesPrismaClient,
  ) {}

  create(input: CreateExpenseRecordInput) {
    const now = new Date();

    return this.prisma.expense.create({
      data: {
        id: randomUUID(),
        name: input.name.trim(),
        category: input.category,
        amount: input.amount,
        expectedAt: input.expectedAt,
        paidAt: input.paidAt ?? null,
        paymentMethod: input.paymentMethod ?? null,
        notes: normalizeOptionalString(input.notes),
        ...connectCostCenter(input.costCenterId),
        updatedAt: now,
      },
      include: { CostCenter: true },
    });
  }

  async findMany(query: ListExpensesQuery) {
    const where = buildExpenseWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: { CostCenter: true },
        orderBy: { expectedAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  findById(id: string) {
    return this.prisma.expense.findUnique({
      where: { id },
      include: { CostCenter: true },
    });
  }

  update(id: string, input: UpdateExpenseRecordInput) {
    const now = new Date();

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.expectedAt !== undefined
          ? { expectedAt: input.expectedAt }
          : {}),
        ...(input.paidAt !== undefined ? { paidAt: input.paidAt } : {}),
        ...(input.paymentMethod !== undefined
          ? { paymentMethod: input.paymentMethod }
          : {}),
        ...(input.notes !== undefined
          ? { notes: normalizeOptionalString(input.notes) }
          : {}),
        ...(input.costCenterId !== undefined
          ? connectCostCenter(input.costCenterId)
          : {}),
        updatedAt: now,
      },
      include: { CostCenter: true },
    });
  }

  findCostCenterById(id: string) {
    return this.prisma.costCenter.findUnique({
      where: { id },
    });
  }
}

function buildExpenseWhere(query: ListExpensesQuery): ExpenseWhereInput {
  const search = query.search?.trim();

  return {
    ...(query.category !== undefined ? { category: query.category } : {}),
    ...(query.costCenterId ? { costCenterId: query.costCenterId.trim() } : {}),
    ...buildExpectedAtWindow(query),
    ...buildPaidAtWindow(query),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { notes: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}

function buildExpectedAtWindow(query: ListExpensesQuery) {
  return query.expectedFrom || query.expectedTo
    ? {
        expectedAt: {
          ...(query.expectedFrom ? { gte: query.expectedFrom } : {}),
          ...(query.expectedTo ? { lte: query.expectedTo } : {}),
        },
      }
    : {};
}

function buildPaidAtWindow(query: ListExpensesQuery) {
  const paidWindow = query.paidFrom || query.paidTo;

  if (!paidWindow && query.isPaid === undefined) {
    return {};
  }

  return {
    paidAt: {
      ...(query.isPaid === true ? { not: null } : {}),
      ...(query.isPaid === false ? { equals: null } : {}),
      ...(query.paidFrom ? { gte: query.paidFrom } : {}),
      ...(query.paidTo ? { lte: query.paidTo } : {}),
    },
  };
}

function connectCostCenter(costCenterId?: string | null) {
  const normalizedId = normalizeOptionalString(costCenterId);

  if (normalizedId === null) {
    return costCenterId !== undefined
      ? { CostCenter: { disconnect: true } }
      : {};
  }

  return { CostCenter: { connect: { id: normalizedId } } };
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}
