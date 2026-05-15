import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Brand, ComponentType, Customer, Prisma, Vehicle } from '../../../generated/prisma/client';
import { normalizeBrandKey, normalizeBrandName } from '../../brands/brand-normalization';
import { slugify } from '../../common/strings/slugify';
import type { CreateComponentDto } from '../dto/create-component.dto';
import {
  LexicalNoteJson,
  normalizeOptionalNoteJson,
} from '../../common/rich-text/lexical-note';

export const COMPONENTS_PRISMA_CLIENT = Symbol('COMPONENTS_PRISMA_CLIENT');

export type ComponentRecord = Prisma.ComponentGetPayload<{
  include: { componentType: true; brandRef?: true };
}>;

export type VehicleOwnershipRecord = Pick<Vehicle, 'id' | 'customerId'>;

export type ComponentOptionRecord = {
  id: string;
  customerId: string;
  vehicleId: string | null;
  brand: string;
  reference: string;
  identifier: string | null;
  isActive: boolean;
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
  isActive?: boolean;
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
  isActive?: boolean;
};

export type ListComponentOptionsQuery = {
  limit: number;
  search?: string;
  customerId?: string;
  vehicleId?: string;
  componentTypeId?: string;
  isActive?: boolean;
};

type ComponentWhereInput = Prisma.ComponentWhereInput;

type ComponentsPrismaClient = {
  $transaction<T>(callback: (transactionClient: ComponentsPrismaTransactionClient) => Promise<T>): Promise<T>;
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

type ComponentsPrismaTransactionClient = ComponentsPrismaClient & {
  brand: {
    findUnique(args: { where: { id: string } | { normalizedName: string } }): Promise<Brand | null>;
    upsert(args: { where: { normalizedName: string }; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<Brand>;
  };
  customer: ComponentsPrismaClient['customer'] & {
    upsert(args: { where: { documentType_documentNumber: { documentType: unknown; documentNumber: string } }; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<Customer>;
  };
  componentType: ComponentsPrismaClient['componentType'] & {
    upsert(args: { where: { slug: string }; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<ComponentType>;
  };
  vehicle: ComponentsPrismaClient['vehicle'] & {
    create(args: { data: Record<string, unknown> }): Promise<Vehicle>;
  };
  component: ComponentsPrismaClient['component'] & {
    create(args: { data: Record<string, unknown>; include: { componentType: true; brandRef: true } }): Promise<ComponentRecord>;
  };
};

@Injectable()
export class ComponentInlineVehicleDuplicatePlateError extends Error {
  constructor() {
    super('Vehicle plate already exists');
  }
}

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
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        updatedAt: now,
      },
    });
  }

  async createWithResolvedRelations(input: CreateComponentDto) {
    const now = new Date();

    try {
      return await this.prisma.$transaction(async (tx) => {
        const customerId = await resolveCustomerId(tx, input, now);
        const componentTypeId = await resolveComponentTypeId(tx, input, now);
        const brand = await resolveBrand(tx, input.brandId, input.brandName ?? input.brand, now);
        const vehicleId = await resolveVehicleId(tx, input, customerId, now);

        return tx.component.create({
          data: {
            id: randomUUID(),
            customerId,
            vehicleId,
            componentTypeId,
            brandId: brand.id,
            brand: brand.name,
            reference: input.reference.trim(),
            identifier: normalizeOptionalString(input.identifier),
            notes: normalizeOptionalNoteJson(input.notes) ?? null,
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            updatedAt: now,
          },
          include: { componentType: true, brandRef: true },
        });
      });
    } catch (error) {
      throw mapComponentWriteError(error);
    }
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
            isActive: true;
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
        isActive: true,
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
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        updatedAt: now,
      },
    });
  }
}

function mapComponentWriteError(error: unknown) {
  if (isPrismaUniqueError(error)) {
    return new ComponentInlineVehicleDuplicatePlateError();
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

async function resolveCustomerId(tx: ComponentsPrismaTransactionClient, input: CreateComponentDto, now: Date) {
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

async function resolveComponentTypeId(tx: ComponentsPrismaTransactionClient, input: CreateComponentDto, now: Date) {
  if (input.componentTypeId) {
    const type = await tx.componentType.findUnique({ where: { id: input.componentTypeId }, select: { id: true } });
    if (!type) throw new Error(`Component type ${input.componentTypeId} not found`);
    return type.id;
  }
  if (!input.componentType) throw new Error('componentTypeId or componentType is required');
  const name = input.componentType.name.trim();
  const slug = slugify(input.componentType.slug ?? name);
  const type = await tx.componentType.upsert({
    where: { slug },
    create: { id: randomUUID(), name, slug, isActive: true, updatedAt: now },
    update: {},
  });
  return type.id;
}

async function resolveBrand(tx: ComponentsPrismaTransactionClient, brandId: string | undefined, nameInput: string | undefined, now: Date) {
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

async function resolveVehicleId(tx: ComponentsPrismaTransactionClient, input: CreateComponentDto, customerId: string, now: Date) {
  if (input.vehicleId) {
    const vehicle = await tx.vehicle.findUnique({ where: { id: input.vehicleId }, select: { id: true, customerId: true } });
    if (!vehicle) throw new Error(`Vehicle ${input.vehicleId} not found`);
    if (vehicle.customerId !== customerId) throw new Error(`Vehicle ${input.vehicleId} does not belong to customer ${customerId}`);
    return vehicle.id;
  }
  if (!input.vehicle) return null;
  const brand = await resolveBrand(tx, input.vehicle.brandId, input.vehicle.brandName ?? input.vehicle.brand, now);
  const vehicle = await tx.vehicle.create({
    data: {
      id: randomUUID(),
      customerId,
      brandId: brand.id,
      brand: brand.name,
      modelReference: input.vehicle.modelReference.trim(),
      plate: input.vehicle.plate.trim().toUpperCase(),
      notes: normalizeOptionalNoteJson(input.vehicle.notes) ?? null,
      ...(input.vehicle.isActive !== undefined ? { isActive: input.vehicle.isActive } : {}),
      updatedAt: now,
    },
  });
  return vehicle.id;
}

function buildComponentWhere(query: ListComponentsQuery): ComponentWhereInput {
  const search = query.search?.trim();

  return {
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.componentTypeId
      ? { componentTypeId: query.componentTypeId }
      : {}),
    ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
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
