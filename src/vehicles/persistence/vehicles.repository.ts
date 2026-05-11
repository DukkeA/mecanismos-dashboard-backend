import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Prisma, Vehicle } from '../../../generated/prisma/client';

export const VEHICLES_PRISMA_CLIENT = Symbol('VEHICLES_PRISMA_CLIENT');

export type VehicleRecord = Vehicle;

export type VehicleOptionRecord = Pick<
  Vehicle,
  'id' | 'customerId' | 'brand' | 'modelReference' | 'plate'
>;

export type CreateVehicleRecordInput = {
  customerId: string;
  brand: string;
  modelReference: string;
  plate: string;
  notes?: string;
};

export type UpdateVehicleRecordInput = Partial<
  Omit<CreateVehicleRecordInput, 'customerId'>
>;

export type ListVehiclesQuery = {
  page: number;
  limit: number;
  search?: string;
  customerId?: string;
};

export type ListVehicleOptionsQuery = {
  limit: number;
  search?: string;
  customerId?: string;
};

type VehicleWhereInput = Prisma.VehicleWhereInput;

type VehiclesPrismaClient = {
  customer: {
    findUnique(args: { where: { id: string }; select: { id: true } }): Promise<{
      id: string;
    } | null>;
  };
  vehicle: {
    create(args: { data: Record<string, unknown> }): Promise<VehicleRecord>;
    findMany(args: {
      where: VehicleWhereInput;
      orderBy: { createdAt: 'desc' };
      skip: number;
      take: number;
    }): Promise<VehicleRecord[]>;
    count(args: { where: VehicleWhereInput }): Promise<number>;
    findUnique(args: { where: { id: string } }): Promise<VehicleRecord | null>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<VehicleRecord>;
  };
};

@Injectable()
export class VehicleDuplicatePlateError extends Error {
  constructor() {
    super('Vehicle plate already exists');
  }
}

@Injectable()
export class VehiclesRepository {
  constructor(
    @Inject(VEHICLES_PRISMA_CLIENT)
    private readonly prisma: VehiclesPrismaClient,
  ) {}

  async create(input: CreateVehicleRecordInput) {
    const now = new Date();

    try {
      return await this.prisma.vehicle.create({
        data: {
          id: randomUUID(),
          customerId: input.customerId.trim(),
          brand: input.brand.trim(),
          modelReference: input.modelReference.trim(),
          plate: normalizePlate(input.plate),
          notes: normalizeOptionalString(input.notes),
          updatedAt: now,
        },
      });
    } catch (error) {
      throw mapVehicleWriteError(error);
    }
  }

  async customerExists(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });

    return Boolean(customer);
  }

  async findMany(query: ListVehiclesQuery) {
    const where = buildVehicleWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  findById(id: string) {
    return this.prisma.vehicle.findUnique({
      where: { id },
    });
  }

  async findOptions(query: ListVehicleOptionsQuery) {
    const prisma = this.prisma as unknown as {
      vehicle: {
        findMany(args: {
          where: VehicleWhereInput;
          orderBy: { plate: 'asc' };
          take: number;
          select: {
            id: true;
            customerId: true;
            brand: true;
            modelReference: true;
            plate: true;
          };
        }): Promise<VehicleOptionRecord[]>;
      };
    };

    return prisma.vehicle.findMany({
      where: buildVehicleWhere({ ...query, page: 1 }),
      orderBy: { plate: 'asc' },
      take: query.limit,
      select: {
        id: true,
        customerId: true,
        brand: true,
        modelReference: true,
        plate: true,
      },
    });
  }

  async update(id: string, input: UpdateVehicleRecordInput) {
    const now = new Date();

    try {
      return await this.prisma.vehicle.update({
        where: { id },
        data: {
          ...(input.brand !== undefined ? { brand: input.brand.trim() } : {}),
          ...(input.modelReference !== undefined
            ? { modelReference: input.modelReference.trim() }
            : {}),
          ...(input.plate !== undefined
            ? { plate: normalizePlate(input.plate) }
            : {}),
          ...(input.notes !== undefined
            ? { notes: normalizeOptionalString(input.notes) }
            : {}),
          updatedAt: now,
        },
      });
    } catch (error) {
      throw mapVehicleWriteError(error);
    }
  }
}

function buildVehicleWhere(query: ListVehiclesQuery): VehicleWhereInput {
  const search = query.search?.trim();

  return {
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(search
      ? {
          OR: [
            { plate: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
            { modelReference: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}

function normalizePlate(plate: string) {
  return plate.trim().toUpperCase();
}

function normalizeOptionalString(value?: string) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function mapVehicleWriteError(error: unknown) {
  if (isPrismaUniqueError(error)) {
    return new VehicleDuplicatePlateError();
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
