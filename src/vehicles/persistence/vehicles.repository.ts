import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Brand, Customer, Prisma, Vehicle } from '../../../generated/prisma/client';
import { normalizeBrandKey, normalizeBrandName } from '../../brands/brand-normalization';
import type { CreateVehicleDto } from '../dto/create-vehicle.dto';
import {
  LexicalNoteJson,
  normalizeOptionalNoteJson,
} from '../../common/rich-text/lexical-note';

export const VEHICLES_PRISMA_CLIENT = Symbol('VEHICLES_PRISMA_CLIENT');

export type VehicleRecord = Vehicle;
export type VehicleWithRelationsRecord = Vehicle & {
  brandRef: Brand | null;
  Customer?: Pick<Customer, 'id' | 'name'>;
};

export type VehicleOptionRecord = Pick<
  Vehicle,
  'id' | 'customerId' | 'brand' | 'modelReference' | 'plate' | 'isActive'
>;

export type CreateVehicleRecordInput = {
  customerId: string;
  brand: string;
  modelReference: string;
  plate: string;
  notes?: LexicalNoteJson | null;
  isActive?: boolean;
};

export type UpdateVehicleRecordInput = Partial<
  Omit<CreateVehicleRecordInput, 'customerId'>
>;

export type ListVehiclesQuery = {
  page: number;
  limit: number;
  search?: string;
  customerId?: string;
  isActive?: boolean;
};

export type ListVehicleOptionsQuery = {
  limit: number;
  search?: string;
  customerId?: string;
  isActive?: boolean;
};

type VehicleWhereInput = Prisma.VehicleWhereInput;

type VehiclesPrismaClient = {
  $transaction<T>(callback: (transactionClient: VehiclesPrismaTransactionClient) => Promise<T>): Promise<T>;
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

type VehiclesPrismaTransactionClient = VehiclesPrismaClient & {
  brand: {
    findUnique(args: { where: { id: string } | { normalizedName: string } }): Promise<Brand | null>;
    upsert(args: { where: { normalizedName: string }; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<Brand>;
  };
  customer: VehiclesPrismaClient['customer'] & {
    upsert(args: { where: { documentType_documentNumber: { documentType: unknown; documentNumber: string } }; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<Customer>;
  };
  vehicle: VehiclesPrismaClient['vehicle'] & {
    create(args: { data: Record<string, unknown>; include: { brandRef: true; Customer: { select: { id: true; name: true } } } }): Promise<VehicleWithRelationsRecord>;
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
          notes: normalizeOptionalNoteJson(input.notes) ?? null,
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          updatedAt: now,
        },
      });
    } catch (error) {
      throw mapVehicleWriteError(error);
    }
  }

  async createWithResolvedRelations(input: CreateVehicleDto) {
    const now = new Date();

    try {
      return await this.prisma.$transaction(async (tx) => {
        const customerId = await resolveCustomerId(tx, input, now);
        const brand = await resolveBrand(tx, input.brandId, input.brandName ?? input.brand, now);

        return tx.vehicle.create({
          data: {
            id: randomUUID(),
            customerId,
            brandId: brand.id,
            brand: brand.name,
            modelReference: input.modelReference.trim(),
            plate: normalizePlate(input.plate),
            notes: normalizeOptionalNoteJson(input.notes) ?? null,
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            updatedAt: now,
          },
          include: { brandRef: true, Customer: { select: { id: true, name: true } } },
        });
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
            isActive: true;
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
        isActive: true,
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
            ? { notes: normalizeOptionalNoteJson(input.notes) }
            : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          updatedAt: now,
        },
      });
    } catch (error) {
      throw mapVehicleWriteError(error);
    }
  }
}

async function resolveCustomerId(tx: VehiclesPrismaTransactionClient, input: CreateVehicleDto, now: Date) {
  if (input.customerId) {
    const customer = await tx.customer.findUnique({ where: { id: input.customerId }, select: { id: true } });
    if (!customer) throw new Error(`Customer ${input.customerId} not found`);
    return customer.id;
  }

  if (!input.customer) throw new Error('customerId or customer is required');

  const customer = await tx.customer.upsert({
    where: { documentType_documentNumber: { documentType: input.customer.documentType, documentNumber: input.customer.documentNumber.trim() } },
    create: {
      id: randomUUID(),
      name: input.customer.name.trim(),
      phone: input.customer.phone.trim(),
      documentType: input.customer.documentType,
      documentNumber: input.customer.documentNumber.trim(),
      email: input.customer.email ?? null,
      notes: normalizeOptionalNoteJson(input.customer.notes) ?? null,
      isActive: input.customer.isActive ?? true,
      updatedAt: now,
    },
    update: {},
  });

  return customer.id;
}

async function resolveBrand(tx: VehiclesPrismaTransactionClient, brandId: string | undefined, nameInput: string | undefined, now: Date) {
  if (brandId) {
    const brand = await tx.brand.findUnique({ where: { id: brandId } });
    if (!brand) throw new Error(`Brand ${brandId} not found`);
    return brand;
  }

  if (!nameInput) throw new Error('brandId or brand is required');
  const name = normalizeBrandName(nameInput);
  return tx.brand.upsert({
    where: { normalizedName: normalizeBrandKey(name) },
    create: { id: randomUUID(), name, normalizedName: normalizeBrandKey(name), isActive: true, updatedAt: now },
    update: { updatedAt: now },
  });
}

function buildVehicleWhere(query: ListVehiclesQuery): VehicleWhereInput {
  const search = query.search?.trim();

  return {
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
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
