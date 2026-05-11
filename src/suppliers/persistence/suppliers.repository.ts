import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  Prisma,
  Supplier,
  SupplierDocumentType,
  SupplierPhone,
  SupplierType,
} from '../../../generated/prisma/client';

export const SUPPLIERS_PRISMA_CLIENT = Symbol('SUPPLIERS_PRISMA_CLIENT');

export type SupplierRecord = Supplier & {
  phones: SupplierPhone[];
};

export type SupplierOptionRecord = Pick<
  Supplier,
  'id' | 'name' | 'contactName' | 'email' | 'isActive' | 'type'
> & {
  phones: Array<Pick<SupplierPhone, 'phone' | 'isPrimary'>>;
};

export type SupplierPhoneRecordInput = {
  label?: string;
  phone: string;
  isPrimary: boolean;
  hasWhatsapp?: boolean;
  notes?: string;
};

export type CreateSupplierRecordInput = {
  name: string;
  type: SupplierType;
  contactName?: string;
  documentType?: SupplierDocumentType;
  documentNumber?: string;
  email?: string;
  notes?: string;
  isActive?: boolean;
  phones: SupplierPhoneRecordInput[];
};

export type UpdateSupplierRecordInput = Partial<
  Omit<CreateSupplierRecordInput, 'phones'>
> & {
  phones?: SupplierPhoneRecordInput[];
};

export type ListSuppliersQuery = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  type?: SupplierType;
};

export type ListSupplierOptionsQuery = {
  limit: number;
  search?: string;
  isActive?: boolean;
  type?: SupplierType;
};

type SupplierWhereInput = Prisma.SupplierWhereInput;

const supplierInclude = {
  phones: {
    orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }],
  },
};

type SuppliersPrismaTransactionClient = {
  supplier: {
    create(args: {
      data: Record<string, unknown>;
      include: typeof supplierInclude;
    }): Promise<SupplierRecord>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<unknown>;
    findUnique(args: {
      where: { id: string };
      include: typeof supplierInclude;
    }): Promise<SupplierRecord | null>;
  };
  supplierPhone: {
    deleteMany(args: { where: { supplierId: string } }): Promise<unknown>;
    createMany(args: {
      data: Array<Record<string, unknown>>;
    }): Promise<unknown>;
  };
};

type SuppliersPrismaClient = {
  $transaction<T>(
    callback: (
      transactionClient: SuppliersPrismaTransactionClient,
    ) => Promise<T>,
  ): Promise<T>;
  supplier: {
    findMany(args: {
      where: SupplierWhereInput;
      orderBy: { createdAt: 'desc' };
      skip: number;
      take: number;
      include: typeof supplierInclude;
    }): Promise<SupplierRecord[]>;
    count(args: { where: SupplierWhereInput }): Promise<number>;
    findUnique(args: {
      where: { id: string };
      include: typeof supplierInclude;
    }): Promise<SupplierRecord | null>;
  };
};

@Injectable()
export class SuppliersRepository {
  constructor(
    @Inject(SUPPLIERS_PRISMA_CLIENT)
    private readonly prisma: SuppliersPrismaClient,
  ) {}

  create(input: CreateSupplierRecordInput) {
    const now = new Date();

    return this.prisma.$transaction((transactionClient) =>
      transactionClient.supplier.create({
        data: {
          id: randomUUID(),
          name: input.name.trim(),
          type: input.type,
          contactName: normalizeOptionalString(input.contactName),
          documentType: input.documentType ?? null,
          documentNumber: normalizeOptionalString(input.documentNumber),
          email: normalizeOptionalEmail(input.email),
          notes: normalizeOptionalString(input.notes),
          isActive: input.isActive ?? true,
          updatedAt: now,
          phones: {
            create: buildPhoneCreateData(input.phones, now),
          },
        },
        include: supplierInclude,
      }),
    );
  }

  async findMany(query: ListSuppliersQuery) {
    const where = buildSupplierWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
        include: supplierInclude,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  findById(id: string) {
    return this.prisma.supplier.findUnique({
      where: { id },
      include: supplierInclude,
    });
  }

  async findOptions(query: ListSupplierOptionsQuery) {
    const prisma = this.prisma as unknown as {
      supplier: {
        findMany(args: {
          where: SupplierWhereInput;
          orderBy: { name: 'asc' };
          take: number;
          include: {
            phones: { select: { phone: true; isPrimary: true } };
          };
        }): Promise<SupplierOptionRecord[]>;
      };
    };

    return prisma.supplier.findMany({
      where: buildSupplierWhere({ ...query, isActive: query.isActive ?? true }),
      orderBy: { name: 'asc' },
      take: query.limit,
      include: {
        phones: { select: { phone: true, isPrimary: true } },
      },
    });
  }

  update(id: string, input: UpdateSupplierRecordInput) {
    const now = new Date();

    return this.prisma.$transaction(async (transactionClient) => {
      await transactionClient.supplier.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.contactName !== undefined
            ? { contactName: normalizeOptionalString(input.contactName) }
            : {}),
          ...(input.documentType !== undefined
            ? { documentType: input.documentType }
            : {}),
          ...(input.documentNumber !== undefined
            ? { documentNumber: normalizeOptionalString(input.documentNumber) }
            : {}),
          ...(input.email !== undefined
            ? { email: normalizeOptionalEmail(input.email) }
            : {}),
          ...(input.notes !== undefined
            ? { notes: normalizeOptionalString(input.notes) }
            : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          updatedAt: now,
        },
      });

      if (input.phones !== undefined) {
        await transactionClient.supplierPhone.deleteMany({
          where: { supplierId: id },
        });
        await transactionClient.supplierPhone.createMany({
          data: buildPhoneCreateManyData(id, input.phones, now),
        });
      }

      const supplier = await transactionClient.supplier.findUnique({
        where: { id },
        include: supplierInclude,
      });

      if (!supplier) {
        throw new Error(`Supplier ${id} not found after update transaction`);
      }

      return supplier;
    });
  }
}

function buildSupplierWhere(query: ListSuppliersQuery): SupplierWhereInput {
  const search = query.search?.trim();

  return {
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { contactName: { contains: search, mode: 'insensitive' } },
            { documentNumber: { contains: search, mode: 'insensitive' } },
            {
              phones: {
                some: {
                  phone: { contains: search, mode: 'insensitive' },
                },
              },
            },
          ],
        }
      : {}),
  };
}

function buildPhoneCreateData(phones: SupplierPhoneRecordInput[], now: Date) {
  return phones.map((phone) => ({
    id: randomUUID(),
    label: normalizeOptionalString(phone.label),
    phone: phone.phone.trim(),
    isPrimary: phone.isPrimary,
    hasWhatsapp: phone.hasWhatsapp ?? false,
    notes: normalizeOptionalString(phone.notes),
    updatedAt: now,
  }));
}

function buildPhoneCreateManyData(
  supplierId: string,
  phones: SupplierPhoneRecordInput[],
  now: Date,
) {
  return phones.map((phone) => ({
    id: randomUUID(),
    supplierId,
    label: normalizeOptionalString(phone.label),
    phone: phone.phone.trim(),
    isPrimary: phone.isPrimary,
    hasWhatsapp: phone.hasWhatsapp ?? false,
    notes: normalizeOptionalString(phone.notes),
    updatedAt: now,
  }));
}

function normalizeOptionalEmail(value?: string) {
  return normalizeOptionalString(value)?.toLowerCase() ?? null;
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}
