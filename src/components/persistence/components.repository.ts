import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Prisma, Vehicle } from '../../../generated/prisma/client';
import {
  LexicalNoteJson,
  normalizeOptionalNoteJson,
} from '../../common/rich-text/lexical-note';

export const COMPONENTS_PRISMA_CLIENT = Symbol('COMPONENTS_PRISMA_CLIENT');

export type ComponentRecord = Prisma.ComponentGetPayload<{
  include: { componentType: true };
}>;

export type VehicleOwnershipRecord = Pick<Vehicle, 'id' | 'customerId'>;

export type ComponentOptionRecord = {
  id: string;
  customerId: string;
  vehicleId: string | null;
  brand: string;
  reference: string;
  identifier: string | null;
  componentType: {
    id: string;
    name: string;
  };
};

export type CreateComponentRecordInput = {
  customerId: string;
  componentTypeId: string;
  vehicleId?: string | null;
  brand: string;
  reference: string;
  identifier?: string;
  notes?: LexicalNoteJson | null;
};

export type UpdateComponentRecordInput = Partial<
  Omit<CreateComponentRecordInput, 'customerId'>
> & {
  vehicleId?: string | null;
};

export type ListComponentsQuery = {
  page: number;
  limit: number;
  search?: string;
  customerId?: string;
  vehicleId?: string;
  componentTypeId?: string;
};

export type ListComponentOptionsQuery = {
  limit: number;
  search?: string;
  customerId?: string;
  vehicleId?: string;
  componentTypeId?: string;
};

type ComponentWhereInput = Prisma.ComponentWhereInput;

type ComponentsPrismaClient = {
  customer: {
    findUnique(args: { where: { id: string }; select: { id: true } }): Promise<{
      id: string;
    } | null>;
  };
  componentType: {
    findUnique(args: {
      where: { id: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
  vehicle: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; customerId: true };
    }): Promise<VehicleOwnershipRecord | null>;
  };
  component: {
    create(args: { data: Record<string, unknown> }): Promise<ComponentRecord>;
    findMany(args: {
      where: ComponentWhereInput;
      orderBy: { createdAt: 'desc' };
      skip: number;
      take: number;
      include: { componentType: true };
    }): Promise<ComponentRecord[]>;
    count(args: { where: ComponentWhereInput }): Promise<number>;
    findUnique(args: {
      where: { id: string };
      include: { componentType: true };
    }): Promise<ComponentRecord | null>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<ComponentRecord>;
  };
};

@Injectable()
export class ComponentsRepository {
  constructor(
    @Inject(COMPONENTS_PRISMA_CLIENT)
    private readonly prisma: ComponentsPrismaClient,
  ) {}

  async create(input: CreateComponentRecordInput) {
    const now = new Date();

    return this.prisma.component.create({
      data: {
        id: randomUUID(),
        customerId: input.customerId.trim(),
        componentTypeId: input.componentTypeId.trim(),
        vehicleId: normalizeOptionalForeignKey(input.vehicleId),
        brand: input.brand.trim(),
        reference: input.reference.trim(),
        identifier: normalizeOptionalString(input.identifier),
        notes: normalizeOptionalNoteJson(input.notes) ?? null,
        updatedAt: now,
      },
    });
  }

  async customerExists(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });

    return Boolean(customer);
  }

  async componentTypeExists(componentTypeId: string) {
    const componentType = await this.prisma.componentType.findUnique({
      where: { id: componentTypeId },
      select: { id: true },
    });

    return Boolean(componentType);
  }

  findVehicleOwnership(vehicleId: string) {
    return this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, customerId: true },
    });
  }

  async findMany(query: ListComponentsQuery) {
    const where = buildComponentWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.component.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
        include: { componentType: true },
      }),
      this.prisma.component.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  findById(id: string) {
    return this.prisma.component.findUnique({
      where: { id },
      include: { componentType: true },
    });
  }

  async findOptions(query: ListComponentOptionsQuery) {
    const prisma = this.prisma as unknown as {
      component: {
        findMany(args: {
          where: ComponentWhereInput;
          orderBy: { createdAt: 'desc' };
          take: number;
          select: {
            id: true;
            customerId: true;
            vehicleId: true;
            brand: true;
            reference: true;
            identifier: true;
            componentType: { select: { id: true; name: true } };
          };
        }): Promise<ComponentOptionRecord[]>;
      };
    };

    return prisma.component.findMany({
      where: buildComponentWhere({ ...query, page: 1 }),
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      select: {
        id: true,
        customerId: true,
        vehicleId: true,
        brand: true,
        reference: true,
        identifier: true,
        componentType: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, input: UpdateComponentRecordInput) {
    const now = new Date();

    return this.prisma.component.update({
      where: { id },
      data: {
        ...(input.vehicleId !== undefined
          ? { vehicleId: normalizeOptionalForeignKey(input.vehicleId) }
          : {}),
        ...(input.componentTypeId !== undefined
          ? { componentTypeId: input.componentTypeId.trim() }
          : {}),
        ...(input.brand !== undefined ? { brand: input.brand.trim() } : {}),
        ...(input.reference !== undefined
          ? { reference: input.reference.trim() }
          : {}),
        ...(input.identifier !== undefined
          ? { identifier: normalizeOptionalString(input.identifier) }
          : {}),
        ...(input.notes !== undefined
          ? { notes: normalizeOptionalNoteJson(input.notes) }
          : {}),
        updatedAt: now,
      },
    });
  }
}

function buildComponentWhere(query: ListComponentsQuery): ComponentWhereInput {
  const search = query.search?.trim();

  return {
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.componentTypeId
      ? { componentTypeId: query.componentTypeId }
      : {}),
    ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
    ...(search
      ? {
          OR: [
            { identifier: { contains: search, mode: 'insensitive' } },
            { reference: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}

function normalizeOptionalForeignKey(value?: string | null) {
  if (value === null) {
    return null;
  }

  return normalizeOptionalString(value);
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}
