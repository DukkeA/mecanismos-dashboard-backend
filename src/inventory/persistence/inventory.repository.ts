import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  InventoryItem,
  InventoryMovement,
  InventoryMovementReason,
  InventoryMovementType,
  Prisma,
} from '../../../generated/prisma/client';
import type {
  InventoryCondition,
  InventoryItemType,
} from '../../../generated/prisma/enums';
import {
  calculateCurrentStock,
  calculateCurrentStockMap,
  type MovementAggregate,
} from '../stock.helpers';

export const INVENTORY_PRISMA_CLIENT = Symbol('INVENTORY_PRISMA_CLIENT');

export type InventoryItemRecord = InventoryItem;
export type InventoryMovementRecord = InventoryMovement;

export type InventoryItemOptionRecord = Pick<
  InventoryItem,
  'id' | 'name' | 'brand' | 'reference' | 'itemType' | 'condition' | 'isActive'
>;

export type CreateInventoryItemRecordInput = {
  name: string;
  itemType: InventoryItemType;
  condition?: InventoryCondition;
  brand?: string;
  reference?: string;
  identifier?: string;
  notes?: string;
  minimumStock?: number;
  defaultSalePrice?: number;
  isActive?: boolean;
};

export type ListInventoryItemsQuery = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  itemType?: InventoryItemType;
  condition?: InventoryCondition;
};

export type ListInventoryItemOptionsQuery = {
  limit: number;
  search?: string;
  isActive?: boolean;
  itemType?: InventoryItemType;
  condition?: InventoryCondition;
};

export type CreateInventoryMovementRecordInput = {
  inventoryItemId: string;
  movementType: InventoryMovementType;
  reason: InventoryMovementReason;
  quantity: number;
  unitCost?: number;
  supplierId?: string;
  occurredAt: Date;
  notes?: string;
};

export class InventoryItemNotFoundError extends Error {
  constructor(id: string) {
    super(`Inventory item ${id} not found`);
  }
}

export class InventoryLedgerSerializationError extends Error {
  constructor() {
    super('Inventory ledger serialization conflict');
  }
}

export class NegativeInventoryStockError extends Error {
  constructor(
    readonly currentStock: number,
    readonly attemptedQuantity: number,
  ) {
    super('Inventory movement would make stock negative');
  }
}

type InventoryItemWhereInput = Prisma.InventoryItemWhereInput;

type InventoryTransactionClient = {
  inventoryItem: {
    findUnique(args: {
      where: { id: string };
    }): Promise<InventoryItemRecord | null>;
  };
  inventoryMovement: {
    groupBy(args: {
      by: ['inventoryItemId', 'movementType'] | ['movementType'];
      where: { inventoryItemId: string };
      _sum: { quantity: true };
    }): Promise<
      Array<MovementAggregate | Omit<MovementAggregate, 'inventoryItemId'>>
    >;
    create(args: {
      data: Record<string, unknown>;
    }): Promise<InventoryMovementRecord>;
  };
};

type InventoryPrismaClient = {
  $transaction<T>(
    callback: (transactionClient: InventoryTransactionClient) => Promise<T>,
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ): Promise<T>;
  inventoryItem: {
    create(args: {
      data: Record<string, unknown>;
    }): Promise<InventoryItemRecord>;
    findMany(args: {
      where: InventoryItemWhereInput;
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }];
      skip: number;
      take: number;
    }): Promise<InventoryItemRecord[]>;
    count(args: { where: InventoryItemWhereInput }): Promise<number>;
    findUnique(args: {
      where: { id: string };
    }): Promise<InventoryItemRecord | null>;
  };
  inventoryMovement: {
    groupBy(args: {
      by: ['inventoryItemId', 'movementType'];
      where: { inventoryItemId: { in: string[] } };
      _sum: { quantity: true };
    }): Promise<MovementAggregate[]>;
    findMany(args: {
      where: { inventoryItemId: string };
      orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }];
    }): Promise<InventoryMovementRecord[]>;
    findUnique(args: {
      where: { id: string };
    }): Promise<InventoryMovementRecord | null>;
  };
};

@Injectable()
export class InventoryRepository {
  constructor(
    @Inject(INVENTORY_PRISMA_CLIENT)
    private readonly prisma: InventoryPrismaClient,
  ) {}

  createItem(input: CreateInventoryItemRecordInput) {
    const now = new Date();

    return this.prisma.inventoryItem.create({
      data: {
        id: randomUUID(),
        name: input.name.trim(),
        itemType: input.itemType,
        condition: input.condition ?? 'NEW',
        brand: normalizeOptionalString(input.brand),
        reference: normalizeOptionalString(input.reference),
        identifier: normalizeOptionalString(input.identifier),
        notes: normalizeOptionalString(input.notes),
        minimumStock: input.minimumStock ?? 0,
        defaultSalePrice: input.defaultSalePrice ?? null,
        isActive: input.isActive ?? true,
        updatedAt: now,
      },
    });
  }

  async findManyItems(query: ListInventoryItemsQuery) {
    const where = buildInventoryItemWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  findItemById(id: string) {
    return this.prisma.inventoryItem.findUnique({
      where: { id },
    });
  }

  async findItemOptions(query: ListInventoryItemOptionsQuery) {
    const prisma = this.prisma as unknown as {
      inventoryItem: {
        findMany(args: {
          where: InventoryItemWhereInput;
          orderBy: [{ name: 'asc' }, { createdAt: 'desc' }];
          take: number;
          select: {
            id: true;
            name: true;
            brand: true;
            reference: true;
            itemType: true;
            condition: true;
            isActive: true;
          };
        }): Promise<InventoryItemOptionRecord[]>;
      };
    };

    return prisma.inventoryItem.findMany({
      where: buildInventoryItemWhere({
        ...query,
        page: 1,
        isActive: query.isActive ?? true,
      }),
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
      take: query.limit,
      select: {
        id: true,
        name: true,
        brand: true,
        reference: true,
        itemType: true,
        condition: true,
        isActive: true,
      },
    });
  }

  async calculateCurrentStocks(itemIds: string[]) {
    if (itemIds.length === 0) {
      return {};
    }

    const movementGroups = await this.prisma.inventoryMovement.groupBy({
      by: ['inventoryItemId', 'movementType'],
      where: { inventoryItemId: { in: itemIds } },
      _sum: { quantity: true },
    });

    return calculateCurrentStockMap(movementGroups);
  }

  async createMovement(input: CreateInventoryMovementRecordInput) {
    try {
      return await this.prisma.$transaction(
        async (transactionClient) => {
          const item = await transactionClient.inventoryItem.findUnique({
            where: { id: input.inventoryItemId },
          });

          if (!item) {
            throw new InventoryItemNotFoundError(input.inventoryItemId);
          }

          const aggregates = await transactionClient.inventoryMovement.groupBy({
            by: ['movementType'],
            where: { inventoryItemId: input.inventoryItemId },
            _sum: { quantity: true },
          });
          const currentStock = calculateCurrentStock(
            aggregates.map((aggregate) => ({
              inventoryItemId: input.inventoryItemId,
              movementType: aggregate.movementType,
              _sum: aggregate._sum,
            })),
          );
          const currentStockAfter =
            currentStock +
            (input.movementType === 'OUT'
              ? input.quantity * -1
              : input.quantity);

          if (currentStockAfter < 0) {
            throw new NegativeInventoryStockError(currentStock, input.quantity);
          }

          const movement = await transactionClient.inventoryMovement.create({
            data: {
              id: randomUUID(),
              inventoryItemId: input.inventoryItemId,
              movementType: input.movementType,
              reason: input.reason,
              quantity: input.quantity,
              unitCost: input.unitCost ?? null,
              supplierId: input.supplierId ?? null,
              occurredAt: input.occurredAt,
              notes: normalizeOptionalString(input.notes),
            },
          });

          return {
            item,
            movement,
            currentStockAfter,
          };
        },
        {
          isolationLevel: 'Serializable',
        },
      );
    } catch (error) {
      if (isPrismaSerializationError(error)) {
        throw new InventoryLedgerSerializationError();
      }

      throw error;
    }
  }

  findMovementById(id: string) {
    return this.prisma.inventoryMovement.findUnique({
      where: { id },
    });
  }

  listMovementsByItem(inventoryItemId: string) {
    return this.prisma.inventoryMovement.findMany({
      where: { inventoryItemId },
      orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }],
    });
  }
}

function buildInventoryItemWhere(
  query: ListInventoryItemsQuery,
): InventoryItemWhereInput {
  const search = query.search?.trim();

  return {
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.itemType ? { itemType: query.itemType } : {}),
    ...(query.condition ? { condition: query.condition } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
            { reference: { contains: search, mode: 'insensitive' } },
            { identifier: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function isPrismaSerializationError(
  error: unknown,
): error is { code: 'P2034' } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2034'
  );
}
