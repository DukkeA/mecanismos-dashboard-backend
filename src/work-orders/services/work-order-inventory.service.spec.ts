import { BadRequestException, ConflictException } from '@nestjs/common';
import { PaymentMethod } from '../../../generated/prisma/enums';
import {
  WorkOrderInventoryReservationConflictError,
  WorkOrderInventoryStockConflictError,
  WorkOrdersRepository,
} from '../persistence/work-orders.repository';
import { WorkOrderReadModelService } from './work-order-read-model.service';
import { WorkOrderRelationsService } from './work-order-relations.service';
import { WorkOrderInventoryService } from './work-order-inventory.service';

describe('WorkOrderInventoryService', () => {
  const repository = {
    createInventoryAction: jest.fn(),
  } as unknown as jest.Mocked<WorkOrdersRepository>;
  const workOrderReadModelService = {
    findOne: jest.fn(),
  } as unknown as jest.Mocked<WorkOrderReadModelService>;
  const workOrderRelationsService = {
    assertInventoryActionRelations: jest.fn(),
  } as unknown as jest.Mocked<WorkOrderRelationsService>;

  let service: WorkOrderInventoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkOrderInventoryService(
      repository,
      workOrderReadModelService,
      workOrderRelationsService,
    );
    workOrderReadModelService.findOne.mockResolvedValue({
      id: 'wo-1',
    } as never);
  });

  it('rejects reserve/release/consume/sell for demand-purchased items before touching the ledger', async () => {
    workOrderRelationsService.assertInventoryActionRelations.mockResolvedValue({
      inventoryItem: {
        id: 'item-1',
        name: 'Tobera cotizable',
        itemType: 'DEMAND_PURCHASED',
      },
    } as never);

    await expect(
      service.reserve('wo-1', {
        inventoryItemId: 'item-1',
        quantity: 1,
        occurredAt: new Date('2026-05-11T10:00:00.000Z'),
        reason: 'WORK_ORDER_PURCHASE',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Demand-purchased items do not allow physical stock movements',
      ),
    );

    expect(repository.createInventoryAction.mock.calls).toHaveLength(0);
  });

  it('maps insufficient stock and partial-release conflicts to typed HTTP exceptions', async () => {
    workOrderRelationsService.assertInventoryActionRelations.mockResolvedValue({
      inventoryItem: {
        id: 'item-1',
        name: 'Inyector Bosch',
        itemType: 'STOCK_OWNED',
      },
    } as never);
    repository.createInventoryAction.mockRejectedValueOnce(
      new WorkOrderInventoryStockConflictError(1, 2),
    );
    repository.createInventoryAction.mockRejectedValueOnce(
      new WorkOrderInventoryReservationConflictError(1, 2),
    );

    await expect(
      service.reserve('wo-1', {
        inventoryItemId: 'item-1',
        quantity: 2,
        occurredAt: new Date('2026-05-11T10:00:00.000Z'),
        reason: 'WORK_ORDER_PURCHASE',
      }),
    ).rejects.toThrow(
      new ConflictException(
        'Inventory action would exceed available stock from 1',
      ),
    );

    await expect(
      service.release('wo-1', {
        inventoryItemId: 'item-1',
        quantity: 2,
        occurredAt: new Date('2026-05-11T11:00:00.000Z'),
        reason: 'RETURN',
      }),
    ).rejects.toThrow(
      new ConflictException('Cannot release 2 units when only 1 are reserved'),
    );
  });

  it('creates consume/sell actions with optional actual cost data and preserves ledger history', async () => {
    workOrderRelationsService.assertInventoryActionRelations.mockResolvedValue({
      inventoryItem: {
        id: 'item-1',
        name: 'Inyector Bosch',
        itemType: 'STOCK_OWNED',
      },
    } as never);
    repository.createInventoryAction.mockResolvedValueOnce({
      movement: { id: 'movement-consume', reason: 'WORK_ORDER_CONSUMPTION' },
      actualCost: { id: 'cost-1', amount: 360000 },
      currentStockAfter: 2,
      workOrderInventory: [],
    } as never);
    repository.createInventoryAction.mockResolvedValueOnce({
      movement: { id: 'movement-sale', reason: 'SALE' },
      currentStockAfter: 1,
      workOrderInventory: [],
    } as never);

    await expect(
      service.consume('wo-1', {
        inventoryItemId: 'item-1',
        quantity: 2,
        occurredAt: new Date('2026-05-11T12:00:00.000Z'),
        reason: 'WORK_ORDER_CONSUMPTION',
        unitCost: 180000,
        actualCostPaymentMethod: PaymentMethod.TRANSFER,
      }),
    ).resolves.toMatchObject({
      movement: { id: 'movement-consume' },
      actualCost: { id: 'cost-1', amount: 360000 },
    });

    await expect(
      service.sell('wo-1', {
        inventoryItemId: 'item-1',
        quantity: 1,
        occurredAt: new Date('2026-05-11T13:00:00.000Z'),
        reason: 'SALE',
        actualCostAmount: 180000,
        actualCostDescription: 'Venta mostrador',
      }),
    ).resolves.toMatchObject({
      movement: { id: 'movement-sale' },
      currentStockAfter: 1,
    });

    expect(repository.createInventoryAction.mock.calls[0][1]).toMatchObject({
      movementReason: 'WORK_ORDER_CONSUMPTION',
      actualCost: {
        amount: 360000,
        category: 'DIRECT_PURCHASE',
      },
    });
    expect(repository.createInventoryAction.mock.calls[1][1]).toMatchObject({
      movementReason: 'SALE',
      actualCost: {
        amount: 180000,
        description: 'Venta mostrador',
      },
    });
  });

  it('propagates quote mismatch and actual-cost rollback failures without extra writes', async () => {
    workOrderRelationsService.assertInventoryActionRelations.mockRejectedValueOnce(
      new BadRequestException(
        'Supplier quote quote-9 does not belong to work order wo-1',
      ),
    );
    workOrderRelationsService.assertInventoryActionRelations.mockResolvedValueOnce(
      {
        inventoryItem: {
          id: 'item-1',
          name: 'Inyector Bosch',
          itemType: 'STOCK_OWNED',
        },
      } as never,
    );
    repository.createInventoryAction.mockRejectedValueOnce(
      new BadRequestException('Actual cost amount must be greater than zero'),
    );

    await expect(
      service.consume('wo-1', {
        inventoryItemId: 'item-1',
        quantity: 1,
        occurredAt: new Date('2026-05-11T14:00:00.000Z'),
        reason: 'WORK_ORDER_CONSUMPTION',
        supplierQuoteHistoryId: 'quote-9',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Supplier quote quote-9 does not belong to work order wo-1',
      ),
    );

    await expect(
      service.consume('wo-1', {
        inventoryItemId: 'item-1',
        quantity: 1,
        occurredAt: new Date('2026-05-11T15:00:00.000Z'),
        reason: 'WORK_ORDER_CONSUMPTION',
        actualCostAmount: 0,
      }),
    ).rejects.toThrow(
      new BadRequestException('Actual cost amount must be greater than zero'),
    );

    expect(repository.createInventoryAction.mock.calls).toHaveLength(1);
  });
});
