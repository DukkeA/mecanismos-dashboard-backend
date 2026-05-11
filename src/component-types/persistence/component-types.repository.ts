import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ComponentType, Prisma } from '../../../generated/prisma/client';

export const COMPONENT_TYPES_PRISMA_CLIENT = Symbol(
  'COMPONENT_TYPES_PRISMA_CLIENT',
);

export type ComponentTypeRecord = ComponentType;

export type ComponentTypeOptionRecord = Pick<
  ComponentType,
  'id' | 'name' | 'description' | 'isActive'
>;

export type CreateComponentTypeRecordInput = {
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
};

export type UpdateComponentTypeRecordInput =
  Partial<CreateComponentTypeRecordInput>;

export type ListComponentTypesQuery = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
};

export type ListComponentTypeOptionsQuery = {
  limit: number;
  search?: string;
  isActive?: boolean;
};

type ComponentTypeWhereInput = Prisma.ComponentTypeWhereInput;

type ComponentTypesPrismaClient = {
  componentType: {
    create(args: {
      data: Record<string, unknown>;
    }): Promise<ComponentTypeRecord>;
    findMany(args: {
      where: ComponentTypeWhereInput;
      orderBy: { name: 'asc' };
      skip: number;
      take: number;
    }): Promise<ComponentTypeRecord[]>;
    count(args: { where: ComponentTypeWhereInput }): Promise<number>;
    findUnique(args: {
      where: { id: string };
    }): Promise<ComponentTypeRecord | null>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<ComponentTypeRecord>;
  };
};

@Injectable()
export class ComponentTypeSlugConflictError extends Error {
  constructor() {
    super('Component type slug already exists');
  }
}

@Injectable()
export class ComponentTypesRepository {
  constructor(
    @Inject(COMPONENT_TYPES_PRISMA_CLIENT)
    private readonly prisma: ComponentTypesPrismaClient,
  ) {}

  async create(input: CreateComponentTypeRecordInput) {
    const now = new Date();

    try {
      return await this.prisma.componentType.create({
        data: {
          id: randomUUID(),
          name: input.name.trim(),
          slug: input.slug.trim(),
          description: normalizeOptionalString(input.description),
          isActive: input.isActive ?? true,
          updatedAt: now,
        },
      });
    } catch (error) {
      throw mapComponentTypeWriteError(error);
    }
  }

  async findMany(query: ListComponentTypesQuery) {
    const where = buildComponentTypeWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.componentType.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: query.limit,
      }),
      this.prisma.componentType.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  findById(id: string) {
    return this.prisma.componentType.findUnique({
      where: { id },
    });
  }

  async findOptions(query: ListComponentTypeOptionsQuery) {
    const prisma = this.prisma as unknown as {
      componentType: {
        findMany(args: {
          where: ComponentTypeWhereInput;
          orderBy: { name: 'asc' };
          take: number;
          select: {
            id: true;
            name: true;
            description: true;
            isActive: true;
          };
        }): Promise<ComponentTypeOptionRecord[]>;
      };
    };

    return prisma.componentType.findMany({
      where: buildComponentTypeWhere({
        ...query,
        page: 1,
        isActive: query.isActive ?? true,
      }),
      orderBy: { name: 'asc' },
      take: query.limit,
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
      },
    });
  }

  async update(id: string, input: UpdateComponentTypeRecordInput) {
    const now = new Date();

    try {
      return await this.prisma.componentType.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.slug !== undefined ? { slug: input.slug.trim() } : {}),
          ...(input.description !== undefined
            ? { description: normalizeOptionalString(input.description) }
            : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          updatedAt: now,
        },
      });
    } catch (error) {
      throw mapComponentTypeWriteError(error);
    }
  }
}

function buildComponentTypeWhere(
  query: ListComponentTypesQuery,
): ComponentTypeWhereInput {
  const search = query.search?.trim();

  return {
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}

function normalizeOptionalString(value?: string) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function mapComponentTypeWriteError(error: unknown) {
  if (isPrismaUniqueError(error)) {
    return new ComponentTypeSlugConflictError();
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
