import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginationMeta } from '../common/pagination/pagination-meta';
import type { CreateExpenseDto } from './dto/create-expense.dto';
import type { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import type { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesRepository } from './persistence/expenses.repository';

type UpdateExpenseInput = Omit<
  UpdateExpenseDto,
  'costCenterId' | 'paidAt' | 'paymentMethod' | 'notes'
> & {
  costCenterId?: UpdateExpenseDto['costCenterId'] | null;
  paidAt?: UpdateExpenseDto['paidAt'] | null;
  paymentMethod?: UpdateExpenseDto['paymentMethod'] | null;
  notes?: UpdateExpenseDto['notes'] | null;
};

@Injectable()
export class ExpensesService {
  constructor(private readonly expensesRepository: ExpensesRepository) {}

  async create(createExpenseDto: CreateExpenseDto) {
    await this.ensureCostCenterExists(createExpenseDto.costCenterId);

    return this.expensesRepository.create(
      mapCreateExpenseInput(createExpenseDto),
    );
  }

  async findAll(query: ListExpensesQueryDto) {
    return buildPaginatedResponse(
      await this.expensesRepository.findMany(query),
    );
  }

  async findOne(id: string) {
    return this.requireExpense(id);
  }

  async update(id: string, updateExpenseDto: UpdateExpenseInput) {
    await this.requireExpense(id);
    await this.ensureCostCenterExists(updateExpenseDto.costCenterId);

    return this.expensesRepository.update(
      id,
      mapUpdateExpenseInput(updateExpenseDto),
    );
  }

  private async ensureCostCenterExists(costCenterId?: string | null) {
    const normalizedId = normalizeOptionalString(costCenterId);

    if (!normalizedId) {
      return;
    }

    const costCenter =
      await this.expensesRepository.findCostCenterById(normalizedId);

    if (!costCenter) {
      throw new NotFoundException(`Cost center ${normalizedId} not found`);
    }
  }

  private async requireExpense(id: string) {
    const expense = await this.expensesRepository.findById(id);

    if (!expense) {
      throw new NotFoundException(`Expense ${id} not found`);
    }

    return expense;
  }
}

function buildPaginatedResponse<T>(result: {
  items: T[];
  page: number;
  limit: number;
  total: number;
}) {
  return {
    data: result.items,
    meta: buildPaginationMeta(result),
  };
}

function mapCreateExpenseInput(createExpenseDto: CreateExpenseDto) {
  return {
    name: createExpenseDto.name.trim(),
    category: createExpenseDto.category,
    amount: createExpenseDto.amount,
    expectedAt: createExpenseDto.expectedAt,
    costCenterId: normalizeOptionalString(createExpenseDto.costCenterId),
    paidAt: createExpenseDto.paidAt ?? undefined,
    paymentMethod: createExpenseDto.paidAt
      ? (createExpenseDto.paymentMethod ?? null)
      : null,
    notes: createExpenseDto.notes ?? null,
  };
}

function mapUpdateExpenseInput(updateExpenseDto: UpdateExpenseInput) {
  return {
    ...(updateExpenseDto.name !== undefined
      ? { name: updateExpenseDto.name.trim() }
      : {}),
    ...(updateExpenseDto.category !== undefined
      ? { category: updateExpenseDto.category }
      : {}),
    ...(updateExpenseDto.amount !== undefined
      ? { amount: updateExpenseDto.amount }
      : {}),
    ...(updateExpenseDto.expectedAt !== undefined
      ? { expectedAt: updateExpenseDto.expectedAt }
      : {}),
    ...(updateExpenseDto.costCenterId !== undefined
      ? { costCenterId: normalizeOptionalString(updateExpenseDto.costCenterId) }
      : {}),
    ...(updateExpenseDto.paidAt !== undefined
      ? {
          paidAt: updateExpenseDto.paidAt,
          paymentMethod: updateExpenseDto.paidAt
            ? (updateExpenseDto.paymentMethod ?? null)
            : null,
        }
      : updateExpenseDto.paymentMethod !== undefined
        ? { paymentMethod: updateExpenseDto.paymentMethod }
        : {}),
    ...(updateExpenseDto.notes !== undefined
      ? { notes: updateExpenseDto.notes }
      : {}),
  };
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}
