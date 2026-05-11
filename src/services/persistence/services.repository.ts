import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Prisma, ServiceCatalog } from '../../../generated/prisma/client';

export const SERVICES_PRISMA_CLIENT = Symbol('SERVICES_PRISMA_CLIENT');

export type ServiceRecord = ServiceCatalog;

export type ServiceOptionRecord = Pick<
  ServiceCatalog,
  'id' | 'name' | 'description' | 'isActive'
>;

export type CreateServiceRecordInput = {
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
};

export type UpdateServiceRecordInput = Partial<CreateServiceRecordInput>;

export type ListServicesQuery = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
};

export type ListServiceOptionsQuery = {
  limit: number;
  search?: string;
  isActive?: boolean;
};

type ServiceCatalogWhereInput = Prisma.ServiceCatalogWhereInput;

type ServicesPrismaClient = {
  serviceCatalog: {
    create(args: { data: Record<string, unknown> }): Promise<ServiceRecord>;
    findMany(args: {
      where: ServiceCatalogWhereInput;
      orderBy: { name: 'asc' };
      skip: number;
      take: number;
    }): Promise<ServiceRecord[]>;
    count(args: { where: ServiceCatalogWhereInput }): Promise<number>;
    findUnique(args: { where: { id: string } }): Promise<ServiceRecord | null>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<ServiceRecord>;
  };
};

@Injectable()
export class ServiceCatalogSlugConflictError extends Error {
  constructor() {
    super('Service catalog slug already exists');
  }
}

@Injectable()
export class ServicesRepository {
  constructor(
    @Inject(SERVICES_PRISMA_CLIENT)
    private readonly prisma: ServicesPrismaClient,
  ) {}

  async create(input: CreateServiceRecordInput) {
    const now = new Date();

    try {
      return await this.prisma.serviceCatalog.create({
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
      throw mapServiceWriteError(error);
    }
  }

  async findMany(query: ListServicesQuery) {
    const where = buildServiceWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.serviceCatalog.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: query.limit,
      }),
      this.prisma.serviceCatalog.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  findById(id: string) {
    return this.prisma.serviceCatalog.findUnique({
      where: { id },
    });
  }

  async findOptions(query: ListServiceOptionsQuery) {
    const prisma = this.prisma as unknown as {
      serviceCatalog: {
        findMany(args: {
          where: ServiceCatalogWhereInput;
          orderBy: { name: 'asc' };
          take: number;
          select: {
            id: true;
            name: true;
            description: true;
            isActive: true;
          };
        }): Promise<ServiceOptionRecord[]>;
      };
    };

    return prisma.serviceCatalog.findMany({
      where: buildServiceWhere({
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

  async update(id: string, input: UpdateServiceRecordInput) {
    const now = new Date();

    try {
      return await this.prisma.serviceCatalog.update({
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
      throw mapServiceWriteError(error);
    }
  }
}

function buildServiceWhere(query: ListServicesQuery): ServiceCatalogWhereInput {
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

function mapServiceWriteError(error: unknown) {
  if (isPrismaUniqueError(error)) {
    return new ServiceCatalogSlugConflictError();
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
