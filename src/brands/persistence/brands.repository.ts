import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Brand, Prisma } from '../../../generated/prisma/client';
import { normalizeBrandKey, normalizeBrandName } from '../brand-normalization';

export const BRANDS_PRISMA_CLIENT = Symbol('BRANDS_PRISMA_CLIENT');

export type BrandRecord = Brand;
export type BrandOptionRecord = Pick<Brand, 'id' | 'name' | 'isActive'>;
export type ListBrandsQuery = { page: number; limit: number; search?: string; isActive?: boolean };
export type ListBrandOptionsQuery = { limit: number; search?: string; isActive?: boolean };

type BrandWhereInput = Prisma.BrandWhereInput;

type BrandsPrismaClient = {
  brand: {
    create(args: { data: Record<string, unknown> }): Promise<BrandRecord>;
    findMany(args: { where: BrandWhereInput; orderBy: { name: 'asc' }; skip?: number; take: number; select?: Record<string, unknown> }): Promise<BrandRecord[]>;
    count(args: { where: BrandWhereInput }): Promise<number>;
    findUnique(args: { where: { id: string } | { normalizedName: string } }): Promise<BrandRecord | null>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<BrandRecord>;
    upsert(args: { where: { normalizedName: string }; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<BrandRecord>;
  };
};

@Injectable()
export class BrandDuplicateNameError extends Error {
  constructor() {
    super('Brand name already exists');
  }
}

@Injectable()
export class BrandsRepository {
  constructor(@Inject(BRANDS_PRISMA_CLIENT) private readonly prisma: BrandsPrismaClient) {}

  create(input: { name: string; isActive?: boolean }) {
    const now = new Date();
    const name = normalizeBrandName(input.name);
    return this.prisma.brand.upsert({
      where: { normalizedName: normalizeBrandKey(name) },
      create: { id: randomUUID(), name, normalizedName: normalizeBrandKey(name), isActive: input.isActive ?? true, updatedAt: now },
      update: { ...(input.isActive !== undefined ? { isActive: input.isActive } : {}), updatedAt: now },
    });
  }

  async findMany(query: ListBrandsQuery) {
    const where = buildBrandWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.brand.findMany({ where, orderBy: { name: 'asc' }, skip, take: query.limit }),
      this.prisma.brand.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  findById(id: string) {
    return this.prisma.brand.findUnique({ where: { id } });
  }

  findOptions(query: ListBrandOptionsQuery) {
    return this.prisma.brand.findMany({
      where: buildBrandWhere({ ...query, page: 1, isActive: query.isActive ?? true }),
      orderBy: { name: 'asc' },
      take: query.limit,
      select: { id: true, name: true, isActive: true },
    }) as unknown as Promise<BrandOptionRecord[]>;
  }

  async update(id: string, input: { name?: string; isActive?: boolean }) {
    const now = new Date();
    const name = input.name === undefined ? undefined : normalizeBrandName(input.name);

    try {
      return await this.prisma.brand.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name, normalizedName: normalizeBrandKey(name) } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          updatedAt: now,
        },
      });
    } catch (error) {
      throw mapBrandWriteError(error);
    }
  }
}

function buildBrandWhere(query: ListBrandsQuery): BrandWhereInput {
  const search = query.search?.trim();
  return {
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { normalizedName: { contains: normalizeBrandKey(search), mode: 'insensitive' } }] } : {}),
  };
}

function mapBrandWriteError(error: unknown) {
  if (isPrismaUniqueError(error)) {
    return new BrandDuplicateNameError();
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
