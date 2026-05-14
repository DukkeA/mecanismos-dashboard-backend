import {
  InventoryCondition,
  InventoryItemType,
} from '../../../generated/prisma/enums';
import { LEXICAL_NOTE_EXAMPLE } from '../../common/rich-text/lexical-note';
import { InventoryRepository } from './inventory.repository';

describe('InventoryRepository', () => {
  it('persists inventory item notes as JSON while trimming string fields', async () => {
    type CreateArgs = { data: Record<string, unknown> };
    let receivedCreateArgs: CreateArgs | undefined;

    const prisma = {
      inventoryItem: {
        create: jest.fn((args: CreateArgs) => {
          receivedCreateArgs = args;

          return Promise.resolve({ id: 'item-1', ...args.data });
        }),
      },
    };

    const repository = new InventoryRepository(prisma as never);

    await expect(
      repository.createItem({
        name: '  Inyector Bosch  ',
        itemType: InventoryItemType.STOCK_OWNED,
        condition: InventoryCondition.NEW,
        brand: ' Bosch ',
        reference: ' 0445120231 ',
        identifier: ' INV-001 ',
        notes: LEXICAL_NOTE_EXAMPLE,
      }),
    ).resolves.toMatchObject({ notes: LEXICAL_NOTE_EXAMPLE });

    expect(receivedCreateArgs?.data).toMatchObject({
      name: 'Inyector Bosch',
      brand: 'Bosch',
      reference: '0445120231',
      identifier: 'INV-001',
      notes: LEXICAL_NOTE_EXAMPLE,
    });
    expect(receivedCreateArgs?.data.id).toEqual(expect.any(String));
    expect(receivedCreateArgs?.data.updatedAt).toEqual(expect.any(Date));
  });

  it('persists inventory movement notes as JSON inside the serializable ledger transaction', async () => {
    type MovementCreateArgs = { data: Record<string, unknown> };
    let receivedMovementCreateArgs: MovementCreateArgs | undefined;

    const item = {
      id: 'item-1',
      name: 'Inyector Bosch',
      itemType: InventoryItemType.STOCK_OWNED,
      condition: InventoryCondition.NEW,
      brand: 'Bosch',
      reference: '0445120231',
      identifier: 'INV-001',
      notes: null,
      minimumStock: 1,
      defaultSalePrice: null,
      isActive: true,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    };
    const tx = {
      inventoryItem: {
        findUnique: jest.fn().mockResolvedValue(item),
      },
      inventoryMovement: {
        groupBy: jest.fn().mockResolvedValue([]),
        create: jest.fn((args: MovementCreateArgs) => {
          receivedMovementCreateArgs = args;

          return Promise.resolve({ id: 'movement-1', ...args.data });
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        <T>(callback: (transactionClient: typeof tx) => Promise<T>) =>
          callback(tx),
      ),
    };

    const repository = new InventoryRepository(prisma as never);
    const occurredAt = new Date('2026-05-06T10:00:00.000Z');

    await expect(
      repository.createMovement({
        inventoryItemId: 'item-1',
        movementType: 'IN',
        reason: 'PURCHASE',
        quantity: 2,
        unitCost: 180000,
        supplierId: 'supplier-1',
        occurredAt,
        notes: LEXICAL_NOTE_EXAMPLE,
      }),
    ).resolves.toMatchObject({
      item,
      movement: { notes: LEXICAL_NOTE_EXAMPLE },
      currentStockAfter: 2,
    });

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    expect(receivedMovementCreateArgs?.data).toMatchObject({
      inventoryItemId: 'item-1',
      movementType: 'IN',
      reason: 'PURCHASE',
      quantity: 2,
      unitCost: 180000,
      supplierId: 'supplier-1',
      occurredAt,
      notes: LEXICAL_NOTE_EXAMPLE,
    });
    expect(receivedMovementCreateArgs?.data.id).toEqual(expect.any(String));
  });

  it('does not include JSON note content in inventory item search filters', async () => {
    type FindManyArgs = { where: Record<string, unknown> };
    type CountArgs = { where: Record<string, unknown> };
    let receivedFindManyArgs: FindManyArgs | undefined;
    let receivedCountArgs: CountArgs | undefined;

    const prisma = {
      inventoryItem: {
        findMany: jest.fn((args: FindManyArgs) => {
          receivedFindManyArgs = args;

          return Promise.resolve([]);
        }),
        count: jest.fn((args: CountArgs) => {
          receivedCountArgs = args;

          return Promise.resolve(0);
        }),
      },
    };

    const repository = new InventoryRepository(prisma as never);

    await repository.findManyItems({
      page: 1,
      limit: 10,
      search: ' hydraulic leak ',
    });

    expect(receivedFindManyArgs?.where).toEqual({
      OR: [
        { name: { contains: 'hydraulic leak', mode: 'insensitive' } },
        { brand: { contains: 'hydraulic leak', mode: 'insensitive' } },
        { reference: { contains: 'hydraulic leak', mode: 'insensitive' } },
        { identifier: { contains: 'hydraulic leak', mode: 'insensitive' } },
      ],
    });
    expect(receivedCountArgs?.where).toEqual(receivedFindManyArgs?.where);
  });
});
