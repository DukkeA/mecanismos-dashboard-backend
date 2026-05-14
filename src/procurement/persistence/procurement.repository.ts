import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  InventoryItem,
  Prisma,
  Supplier,
  SupplierQuoteHistory,
} from '../../../generated/prisma/client';
import type { SupplierQuoteStatus } from '../../../generated/prisma/enums';
import {
  buildLatestValidQuoteSummary,
  sortQuotesChronologically,
} from '../quote.helpers';
import type { ListSupplierQuotesQueryDto } from '../dto/list-supplier-quotes-query.dto';
import {
  LexicalNoteJson,
  normalizeOptionalNoteJson,
} from '../../common/rich-text/lexical-note';

export const PROCUREMENT_PRISMA_CLIENT = Symbol('PROCUREMENT_PRISMA_CLIENT');

export class SupplierNotFoundError extends Error {
  constructor(id: string) {
    super(`Supplier ${id} not found`);
  }
}

export class InventoryQuoteItemNotFoundError extends Error {
  constructor(id: string) {
    super(`Inventory item ${id} not found`);
  }
}

type QuoteRecord = Omit<SupplierQuoteHistory, 'notes'> & {
  notes: LexicalNoteJson | null;
  supplier: Pick<Supplier, 'id' | 'name' | 'contactName'>;
  inventoryItem: Pick<
    InventoryItem,
    'id' | 'name' | 'brand' | 'reference' | 'identifier'
  >;
};

type PrismaQuoteRecord = SupplierQuoteHistory & {
  Supplier: Pick<Supplier, 'id' | 'name' | 'contactName'>;
  InventoryItem: Pick<
    InventoryItem,
    'id' | 'name' | 'brand' | 'reference' | 'identifier'
  >;
};

type ProcurementPrismaClient = {
  supplier: {
    findUnique(args: { where: { id: string } }): Promise<Supplier | null>;
  };
  inventoryItem: {
    findUnique(args: { where: { id: string } }): Promise<InventoryItem | null>;
  };
  supplierQuoteHistory: {
    create(args: {
      data: Record<string, unknown>;
      include: typeof quoteInclude;
    }): Promise<PrismaQuoteRecord>;
    findUnique(args: {
      where: { id: string };
      include: typeof quoteInclude;
    }): Promise<PrismaQuoteRecord | null>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      include: typeof quoteInclude;
    }): Promise<PrismaQuoteRecord>;
    findMany(args: {
      where: Prisma.SupplierQuoteHistoryWhereInput;
      include: typeof quoteInclude;
      orderBy: [{ quotedAt: 'desc' }, { createdAt: 'desc' }];
      skip?: number;
      take?: number;
    }): Promise<PrismaQuoteRecord[]>;
    count(args: {
      where: Prisma.SupplierQuoteHistoryWhereInput;
    }): Promise<number>;
  };
};

const quoteInclude = {
  Supplier: {
    select: {
      id: true,
      name: true,
      contactName: true,
    },
  },
  InventoryItem: {
    select: {
      id: true,
      name: true,
      brand: true,
      reference: true,
      identifier: true,
    },
  },
};

@Injectable()
export class ProcurementRepository {
  constructor(
    @Inject(PROCUREMENT_PRISMA_CLIENT)
    private readonly prisma: ProcurementPrismaClient,
  ) {}

  async ensureSupplierExists(supplierId: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new SupplierNotFoundError(supplierId);
    }

    return supplier;
  }

  async ensureInventoryItemExists(inventoryItemId: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    });

    if (!item) {
      throw new InventoryQuoteItemNotFoundError(inventoryItemId);
    }

    return item;
  }

  createQuote(input: {
    supplierId: string;
    inventoryItemId: string;
    quotedCost: number;
    quotedAt: Date;
    notes?: LexicalNoteJson | null;
  }) {
    const now = new Date();

    return this.prisma.supplierQuoteHistory
      .create({
        data: {
          id: randomUUID(),
          supplierId: input.supplierId,
          inventoryItemId: input.inventoryItemId,
          quotedCost: input.quotedCost,
          quotedAt: input.quotedAt,
          notes: normalizeOptionalNoteJson(input.notes) ?? null,
          status: 'ACTIVE',
          updatedAt: now,
        },
        include: quoteInclude,
      })
      .then(mapQuoteRecord);
  }

  findQuoteById(id: string) {
    return this.prisma.supplierQuoteHistory
      .findUnique({
        where: { id },
        include: quoteInclude,
      })
      .then((quote) => (quote ? mapQuoteRecord(quote) : null));
  }

  updateQuoteCorrection(
    id: string,
    input: {
      quotedCost?: number;
      quotedAt?: Date;
      notes?: LexicalNoteJson | null;
      correctionReason: string;
    },
  ) {
    return this.prisma.supplierQuoteHistory
      .update({
        where: { id },
        data: {
          ...(input.quotedCost !== undefined
            ? { quotedCost: input.quotedCost }
            : {}),
          ...(input.quotedAt !== undefined ? { quotedAt: input.quotedAt } : {}),
          ...(input.notes !== undefined
            ? { notes: normalizeOptionalNoteJson(input.notes) }
            : {}),
          correctionReason: input.correctionReason.trim(),
          updatedAt: new Date(),
        },
        include: quoteInclude,
      })
      .then(mapQuoteRecord);
  }

  voidQuote(id: string, voidReason: string) {
    const now = new Date();

    return this.prisma.supplierQuoteHistory
      .update({
        where: { id },
        data: {
          status: 'VOIDED',
          voidedAt: now,
          voidReason: voidReason.trim(),
          updatedAt: now,
        },
        include: quoteInclude,
      })
      .then(mapQuoteRecord);
  }

  async findItemQuoteLookup(inventoryItemId: string) {
    const history = await this.prisma.supplierQuoteHistory.findMany({
      where: { inventoryItemId },
      include: quoteInclude,
      orderBy: [{ quotedAt: 'desc' }, { createdAt: 'desc' }],
    });

    const sortedHistory = sortQuotesChronologically(
      history.map(mapQuoteRecord),
    );

    return {
      latestBySupplier: buildLatestValidQuoteSummary(sortedHistory),
      history: sortedHistory,
    };
  }

  async findSupplierQuoteTimeline(
    supplierId: string,
    query: ListSupplierQuotesQueryDto,
  ) {
    const where = buildSupplierQuoteWhere({ supplierId, ...query });
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.supplierQuoteHistory.findMany({
        where,
        include: quoteInclude,
        orderBy: [{ quotedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.supplierQuoteHistory.count({ where }),
    ]);

    return {
      items: items.map(mapQuoteRecord),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
}

function buildSupplierQuoteWhere(input: {
  supplierId: string;
  search?: string;
  status?: SupplierQuoteStatus;
  includeVoided?: boolean;
  inventoryItemId?: string;
  quotedFrom?: Date;
  quotedTo?: Date;
}) {
  const search = input.search?.trim();

  return {
    supplierId: input.supplierId,
    ...(input.status
      ? { status: input.status }
      : input.includeVoided === true
        ? {}
        : { status: 'ACTIVE' as const }),
    ...(input.inventoryItemId
      ? { inventoryItemId: input.inventoryItemId }
      : {}),
    ...(input.quotedFrom || input.quotedTo
      ? {
          quotedAt: {
            ...(input.quotedFrom ? { gte: input.quotedFrom } : {}),
            ...(input.quotedTo ? { lte: input.quotedTo } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            {
              InventoryItem: {
                name: { contains: search, mode: 'insensitive' },
              },
            },
            {
              InventoryItem: {
                brand: { contains: search, mode: 'insensitive' },
              },
            },
            {
              InventoryItem: {
                reference: { contains: search, mode: 'insensitive' },
              },
            },
            {
              InventoryItem: {
                identifier: { contains: search, mode: 'insensitive' },
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.SupplierQuoteHistoryWhereInput;
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function mapQuoteRecord(record: PrismaQuoteRecord): QuoteRecord {
  const { Supplier, InventoryItem, ...quote } = record;

  return {
      ...(quote as Omit<typeof quote, 'notes'>),
      notes: quote.notes as LexicalNoteJson | null,
    supplier: Supplier,
    inventoryItem: InventoryItem,
  };
}
