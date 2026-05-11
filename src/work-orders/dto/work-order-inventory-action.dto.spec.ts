import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  InventoryMovementReason,
  PaymentMethod,
} from '../../../generated/prisma/enums';
import {
  ConsumeWorkOrderInventoryDto,
  ReleaseWorkOrderInventoryDto,
  ReserveWorkOrderInventoryDto,
  SellWorkOrderInventoryDto,
} from './work-order-inventory-action.dto';

describe('work-order inventory action DTO contracts', () => {
  it('trims shared fields and accepts optional actual-cost details for consume/sell', async () => {
    const consumeDto = plainToInstance(ConsumeWorkOrderInventoryDto, {
      inventoryItemId: ' inventory-1 ',
      quantity: 2,
      occurredAt: '2026-05-11T10:00:00.000Z',
      reason: InventoryMovementReason.WORK_ORDER_CONSUMPTION,
      supplierId: ' supplier-1 ',
      supplierQuoteHistoryId: ' quote-1 ',
      notes: ' consumo final ',
      unitCost: 180000,
      actualCostAmount: 360000,
      actualCostDescription: ' consumo inventario ',
      actualCostPaymentMethod: PaymentMethod.TRANSFER,
    });
    const sellDto = plainToInstance(SellWorkOrderInventoryDto, {
      inventoryItemId: ' inventory-1 ',
      quantity: 1,
      occurredAt: '2026-05-11T11:00:00.000Z',
      reason: InventoryMovementReason.SALE,
      actualCostDescription: ' venta mostrador ',
    });

    expect(consumeDto.inventoryItemId).toBe('inventory-1');
    expect(consumeDto.supplierId).toBe('supplier-1');
    expect(consumeDto.supplierQuoteHistoryId).toBe('quote-1');
    expect(consumeDto.notes).toBe('consumo final');
    expect(consumeDto.actualCostDescription).toBe('consumo inventario');
    expect(sellDto.actualCostDescription).toBe('venta mostrador');

    await expect(validate(consumeDto)).resolves.toHaveLength(0);
    await expect(validate(sellDto)).resolves.toHaveLength(0);
  });

  it('rejects invalid reserve/release payloads and reserve reasons outside the route contract', async () => {
    const invalidReserveDto = plainToInstance(ReserveWorkOrderInventoryDto, {
      inventoryItemId: 'inventory-1',
      quantity: 0,
      occurredAt: '2026-05-11T12:00:00.000Z',
      reason: InventoryMovementReason.SALE,
    });
    const validReleaseDto = plainToInstance(ReleaseWorkOrderInventoryDto, {
      inventoryItemId: ' inventory-1 ',
      quantity: 1,
      occurredAt: '2026-05-11T13:00:00.000Z',
      reason: InventoryMovementReason.RETURN,
    });

    const errors = await validate(invalidReserveDto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['quantity', 'reason']),
    );
    expect(validReleaseDto.inventoryItemId).toBe('inventory-1');
    await expect(validate(validReleaseDto)).resolves.toHaveLength(0);
  });
});
