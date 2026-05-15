import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  Customer,
  CustomerDocumentType,
  Prisma,
} from '../../../generated/prisma/client';
import {
  LexicalNoteJson,
  normalizeOptionalNoteJson,
} from '../../common/rich-text/lexical-note';
import {
  DEFAULT_CUSTOMER_LIST_SORT,
  type CustomerListSortDirection,
  type CustomerListSortField,
} from '../customer-list-sorting';

export const CUSTOMERS_PRISMA_CLIENT = Symbol('CUSTOMERS_PRISMA_CLIENT');

export type CustomerRecord = Customer;

export type CustomerOptionRecord = Pick<
  Customer,
  | 'id'
  | 'name'
  | 'phone'
  | 'documentType'
  | 'documentNumber'
  | 'email'
  | 'isActive'
>;

export type CreateCustomerRecordInput = {
  name: string;
  phone: string;
  documentType: CustomerDocumentType;
  documentNumber: string;
  email?: string;
  notes?: LexicalNoteJson | null;
  isActive?: boolean;
};

export type UpdateCustomerRecordInput = Partial<CreateCustomerRecordInput>;

export type ListCustomersQuery = {
  page: number;
  limit: number;
  search?: string;
  documentType?: CustomerDocumentType;
  sortBy?: CustomerListSortField;
  sortDir?: CustomerListSortDirection;
  isActive?: boolean;
};

export type ListCustomerOptionsQuery = {
  limit: number;
  search?: string;
  documentType?: CustomerDocumentType;
  isActive?: boolean;
};

type CustomerWhereInput = Prisma.CustomerWhereInput;
type CustomerOrderByInput = Pick<
  Prisma.CustomerOrderByWithRelationInput,
  CustomerListSortField
>;

type CustomersPrismaClient = {
  customer: {
    create(args: { data: Record<string, unknown> }): Promise<CustomerRecord>;
    findMany(args: {
      where: CustomerWhereInput;
      orderBy: CustomerOrderByInput;
      skip: number;
      take: number;
    }): Promise<CustomerRecord[]>;
    count(args: { where: CustomerWhereInput }): Promise<number>;
    findUnique(args: { where: { id: string } }): Promise<CustomerRecord | null>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<CustomerRecord>;
  };
};

@Injectable()
export class CustomerDuplicateDocumentError extends Error {
  constructor() {
    super('Customer document already exists');
  }
}

@Injectable()
export class CustomersRepository {
  constructor(
    @Inject(CUSTOMERS_PRISMA_CLIENT)
    private readonly prisma: CustomersPrismaClient,
  ) {}

  async create(input: CreateCustomerRecordInput) {
    const now = new Date();

    try {
      return await this.prisma.customer.create({
        data: {
          id: randomUUID(),
          name: input.name.trim(),
          phone: input.phone.trim(),
          documentType: input.documentType,
          documentNumber: input.documentNumber.trim(),
          email: normalizeOptionalEmail(input.email),
          notes: normalizeOptionalNoteJson(input.notes) ?? null,
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          updatedAt: now,
        },
      });
    } catch (error) {
      throw mapCustomerWriteError(error);
    }
  }

  async findMany(query: ListCustomersQuery) {
    const where = buildCustomerWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: buildCustomerOrderBy(query),
        skip,
        take: query.limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  findById(id: string) {
    return this.prisma.customer.findUnique({
      where: { id },
    });
  }

  async findOptions(query: ListCustomerOptionsQuery) {
    const prisma = this.prisma as unknown as {
      customer: {
        findMany(args: {
          where: CustomerWhereInput;
          orderBy: { name: 'asc' };
          take: number;
          select: {
            id: true;
            name: true;
            phone: true;
            documentType: true;
            documentNumber: true;
            email: true;
            isActive: true;
          };
        }): Promise<CustomerOptionRecord[]>;
      };
    };

    return prisma.customer.findMany({
      where: buildCustomerWhere({ ...query, page: 1 }),
      orderBy: { name: 'asc' },
      take: query.limit,
      select: {
        id: true,
        name: true,
        phone: true,
        documentType: true,
        documentNumber: true,
        email: true,
        isActive: true,
      },
    });
  }

  async update(id: string, input: UpdateCustomerRecordInput) {
    const now = new Date();

    try {
      return await this.prisma.customer.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.phone !== undefined ? { phone: input.phone.trim() } : {}),
          ...(input.documentType !== undefined
            ? { documentType: input.documentType }
            : {}),
          ...(input.documentNumber !== undefined
            ? { documentNumber: input.documentNumber.trim() }
            : {}),
          ...(input.email !== undefined
            ? { email: normalizeOptionalEmail(input.email) }
            : {}),
          ...(input.notes !== undefined
            ? { notes: normalizeOptionalNoteJson(input.notes) }
            : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          updatedAt: now,
        },
      });
    } catch (error) {
      throw mapCustomerWriteError(error);
    }
  }
}

function buildCustomerWhere(query: ListCustomersQuery): CustomerWhereInput {
  const search = query.search?.trim();

  return {
    ...(query.documentType ? { documentType: query.documentType } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { documentNumber: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}

function buildCustomerOrderBy(query: ListCustomersQuery): CustomerOrderByInput {
  const sortBy = query.sortBy ?? DEFAULT_CUSTOMER_LIST_SORT.sortBy;
  const sortDir = query.sortDir ?? DEFAULT_CUSTOMER_LIST_SORT.sortDir;

  return { [sortBy]: sortDir };
}

function normalizeOptionalEmail(value?: string) {
  return normalizeOptionalString(value)?.toLowerCase() ?? null;
}

function normalizeOptionalString(value?: string) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function mapCustomerWriteError(error: unknown) {
  if (isPrismaUniqueError(error)) {
    return new CustomerDuplicateDocumentError();
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
