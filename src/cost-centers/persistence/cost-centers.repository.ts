import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { CostCenter, Prisma } from '../../../generated/prisma/client';

export const COST_CENTERS_PRISMA_CLIENT = Symbol('COST_CENTERS_PRISMA_CLIENT');

export type CostCenterRecord = CostCenter;

export type CreateCostCenterRecordInput = {
  code: string;
  name: string;
  isActive?: boolean;
};

export type UpdateCostCenterRecordInput = Partial<CreateCostCenterRecordInput>;

export type ListCostCentersQuery = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
};

type CostCenterWhereInput = Prisma.CostCenterWhereInput;

type CostCentersPrismaClient = {
  costCenter: {
    create(args: { data: Record<string, unknown> }): Promise<CostCenterRecord>;
    findMany(args: {
      where: CostCenterWhereInput;
      orderBy: { name: 'asc' };
      skip: number;
      take: number;
    }): Promise<CostCenterRecord[]>;
    count(args: { where: CostCenterWhereInput }): Promise<number>;
    findUnique(args: {
      where: { id: string };
    }): Promise<CostCenterRecord | null>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<CostCenterRecord>;
  };
};

@Injectable()
export class CostCenterCodeConflictError extends Error {
  constructor() {
    super('Cost center code already exists');
  }
}

@Injectable()
export class CostCentersRepository {
  constructor(
    @Inject(COST_CENTERS_PRISMA_CLIENT)
    private readonly prisma: CostCentersPrismaClient,
  ) {}

  async create(input: CreateCostCenterRecordInput) {
    const now = new Date();

    try {
      return await this.prisma.costCenter.create({
        data: {
          id: randomUUID(),
          code: input.code.trim(),
          name: input.name.trim(),
          isActive: input.isActive ?? true,
          updatedAt: now,
        },
      });
    } catch (error) {
      throw mapCostCenterWriteError(error);
    }
  }

  async findMany(query: ListCostCentersQuery) {
    const where = buildCostCenterWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.costCenter.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: query.limit,
      }),
      this.prisma.costCenter.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  findById(id: string) {
    return this.prisma.costCenter.findUnique({
      where: { id },
    });
  }

  async update(id: string, input: UpdateCostCenterRecordInput) {
    const now = new Date();

    try {
      return await this.prisma.costCenter.update({
        where: { id },
        data: {
          ...(input.code !== undefined ? { code: input.code.trim() } : {}),
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          updatedAt: now,
        },
      });
    } catch (error) {
      throw mapCostCenterWriteError(error);
    }
  }
}

function buildCostCenterWhere(
  query: ListCostCentersQuery,
): CostCenterWhereInput {
  const search = query.search?.trim();

  return {
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}

function mapCostCenterWriteError(error: unknown) {
  if (isPrismaUniqueError(error)) {
    return new CostCenterCodeConflictError();
  }

  return error;
}

function isPrismaUniqueError(error: unknown): error is { code: 'P2002' } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
