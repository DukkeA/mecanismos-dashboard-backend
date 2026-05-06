import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  InventoryLedgerSerializationError,
  InventoryRepository,
  NegativeInventoryStockError,
} from './persistence/inventory.repository';
import {
  InventoryCondition,
  InventoryItemType,
} from '../../generated/prisma/enums';

describe('InventoryService', () => {
  const itemRecord = {
    id: 'item-1',
    name: 'Inyector Bosch',
    itemType: 'STOCK_OWNED' as InventoryItemType,
    condition: 'NEW' as InventoryCondition,
    brand: 'Bosch',
    reference: '0445120231',
    identifier: 'INV-001',
    notes: null,
    minimumStock: 1,
    defaultSalePrice: 250000,
    isActive: true,
    createdAt: new Date('2026-05-06T10:00:00.000Z'),
    updatedAt: new Date('2026-05-06T10:00:00.000Z'),
  };

  const repository = {
    createItem: jest.fn(),
    findManyItems: jest.fn(),
    calculateCurrentStocks: jest.fn(),
    findItemById: jest.fn(),
    createMovement: jest.fn(),
    listMovementsByItem: jest.fn(),
    findMovementById: jest.fn(),
  } as unknown as jest.Mocked<InventoryRepository>;

  let service: InventoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventoryService(repository);
  });

  it('lists inventory items with derived current stock and zero for items without movements', async () => {
    repository.findManyItems.mockResolvedValue({
      items: [
        itemRecord,
        { ...itemRecord, id: 'item-2', name: 'Tobera cotizable' },
      ],
      total: 2,
      page: 1,
      limit: 10,
    });
    repository.calculateCurrentStocks.mockResolvedValue({ 'item-1': 3 });

    await expect(service.findAll({ page: 1, limit: 10 })).resolves.toEqual({
      data: [
        { ...itemRecord, currentStock: 3 },
        {
          ...itemRecord,
          id: 'item-2',
          name: 'Tobera cotizable',
          currentStock: 0,
        },
      ],
      meta: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      },
    });
  });

  it('returns one inventory item with currentStock zero when it has no movements', async () => {
    repository.findItemById.mockResolvedValue(itemRecord);
    repository.calculateCurrentStocks.mockResolvedValue({});

    await expect(service.findOne('item-1')).resolves.toEqual({
      ...itemRecord,
      currentStock: 0,
    });
  });

  it('rejects physical ledger writes for demand-purchased items', async () => {
    repository.findItemById.mockResolvedValue({
      ...itemRecord,
      itemType: 'DEMAND_PURCHASED' as InventoryItemType,
    });

    await expect(
      service.createMovement('item-1', {
        movementType: 'IN',
        reason: 'PURCHASE',
        quantity: 1,
        occurredAt: new Date('2026-05-06T10:00:00.000Z'),
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Demand-purchased items do not allow physical stock movements',
      ),
    );
  });

  it('maps negative stock rejection to a conflict exception', async () => {
    repository.findItemById.mockResolvedValue(itemRecord);
    repository.createMovement.mockRejectedValue(
      new NegativeInventoryStockError(2, 3),
    );

    await expect(
      service.createMovement('item-1', {
        movementType: 'OUT',
        reason: 'SALE',
        quantity: 3,
        occurredAt: new Date('2026-05-06T10:00:00.000Z'),
      }),
    ).rejects.toThrow(
      new ConflictException(
        'Inventory movement would make stock negative from 2',
      ),
    );
  });

  it('maps serializable ledger collisions to a retry-safe conflict exception', async () => {
    repository.findItemById.mockResolvedValue(itemRecord);
    repository.createMovement.mockRejectedValue(
      new InventoryLedgerSerializationError(),
    );

    await expect(
      service.createMovement('item-1', {
        movementType: 'IN',
        reason: 'PURCHASE',
        quantity: 1,
        occurredAt: new Date('2026-05-06T10:00:00.000Z'),
      }),
    ).rejects.toThrow(
      new ConflictException(
        'Inventory movement conflicted with another stock write. Retry the request.',
      ),
    );
  });

  it('returns chronological movement reads for one item', async () => {
    repository.findItemById.mockResolvedValue(itemRecord);
    repository.calculateCurrentStocks.mockResolvedValue({ 'item-1': 3 });
    repository.listMovementsByItem.mockResolvedValue([
      {
        id: 'movement-1',
        inventoryItemId: 'item-1',
        movementType: 'IN',
        reason: 'PURCHASE',
        quantity: 3,
        unitCost: 180000,
        supplierId: 'supplier-1',
        workOrderId: null,
        isReservedForWorkOrder: false,
        occurredAt: new Date('2026-05-06T08:00:00.000Z'),
        notes: null,
        createdAt: new Date('2026-05-06T08:05:00.000Z'),
      },
    ]);

    await expect(service.listItemMovements('item-1')).resolves.toHaveLength(1);
  });

  it('throws not found for missing movement ids', async () => {
    repository.findMovementById.mockResolvedValue(null);

    await expect(service.findMovement('missing-movement')).rejects.toThrow(
      new NotFoundException('Inventory movement missing-movement not found'),
    );
  });
});
