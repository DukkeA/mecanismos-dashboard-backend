import { WorkOrdersService } from './work-orders.service';

describe('WorkOrdersService inventory delegation', () => {
  const workOrderInventoryService = {
    reserve: jest.fn(),
    release: jest.fn(),
    consume: jest.fn(),
    sell: jest.fn(),
  };

  const service = new WorkOrdersService(
    {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    } as never,
    { upsertEstimate: jest.fn(), findEstimates: jest.fn() } as never,
    {
      createActualCost: jest.fn(),
      findActualCosts: jest.fn(),
      updateActualCost: jest.fn(),
      removeActualCost: jest.fn(),
    } as never,
    {
      createPayment: jest.fn(),
      findPayments: jest.fn(),
      updatePayment: jest.fn(),
      removePayment: jest.fn(),
    } as never,
    workOrderInventoryService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates reserve, release, consume, and sell inventory actions', async () => {
    const reserveDto = { inventoryItemId: 'item-1', quantity: 1 };
    const releaseDto = { inventoryItemId: 'item-1', quantity: 1 };
    const consumeDto = { inventoryItemId: 'item-1', quantity: 1 };
    const sellDto = { inventoryItemId: 'item-1', quantity: 1 };

    workOrderInventoryService.reserve.mockResolvedValue({
      movement: { id: 'm-1' },
    });
    workOrderInventoryService.release.mockResolvedValue({
      movement: { id: 'm-2' },
    });
    workOrderInventoryService.consume.mockResolvedValue({
      movement: { id: 'm-3' },
    });
    workOrderInventoryService.sell.mockResolvedValue({
      movement: { id: 'm-4' },
    });

    await expect(
      service.reserveInventory('wo-1', reserveDto as never),
    ).resolves.toEqual({ movement: { id: 'm-1' } });
    await expect(
      service.releaseInventory('wo-1', releaseDto as never),
    ).resolves.toEqual({ movement: { id: 'm-2' } });
    await expect(
      service.consumeInventory('wo-1', consumeDto as never),
    ).resolves.toEqual({ movement: { id: 'm-3' } });
    await expect(
      service.sellInventory('wo-1', sellDto as never),
    ).resolves.toEqual({ movement: { id: 'm-4' } });

    expect(workOrderInventoryService.reserve).toHaveBeenCalledWith(
      'wo-1',
      reserveDto,
    );
    expect(workOrderInventoryService.release).toHaveBeenCalledWith(
      'wo-1',
      releaseDto,
    );
    expect(workOrderInventoryService.consume).toHaveBeenCalledWith(
      'wo-1',
      consumeDto,
    );
    expect(workOrderInventoryService.sell).toHaveBeenCalledWith(
      'wo-1',
      sellDto,
    );
  });
});
