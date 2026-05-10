import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaymentMethod, WorkOrderCostCategory } from '../../../generated/prisma/enums';
import { CreateWorkOrderActualCostDto } from './create-work-order-actual-cost.dto';
import { UpdateWorkOrderActualCostDto } from './update-work-order-actual-cost.dto';

describe('work-order actual cost DTO contracts', () => {
  it('trims optional link fields for direct-purchase actual costs', async () => {
    const dto = plainToInstance(CreateWorkOrderActualCostDto, {
      category: WorkOrderCostCategory.DIRECT_PURCHASE,
      description: ' Rodamiento SKF ',
      amount: 150000,
      incurredAt: '2026-05-10T18:00:00.000Z',
      paymentMethod: PaymentMethod.TRANSFER,
      supplierId: ' supplier-1 ',
      inventoryItemId: ' inventory-1 ',
      supplierQuoteHistoryId: ' quote-1 ',
      notes: ' Compra urgente ',
    });

    expect(dto.description).toBe('Rodamiento SKF');
    expect(dto.supplierId).toBe('supplier-1');
    expect(dto.inventoryItemId).toBe('inventory-1');
    expect(dto.supplierQuoteHistoryId).toBe('quote-1');
    expect(dto.notes).toBe('Compra urgente');
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects direct-purchase actual costs without a supplier link while keeping updates partial', async () => {
    const invalidCreateDto = plainToInstance(CreateWorkOrderActualCostDto, {
      category: WorkOrderCostCategory.DIRECT_PURCHASE,
      description: 'Rodamiento SKF',
      amount: 150000,
      incurredAt: '2026-05-10T18:00:00.000Z',
    });
    const validUpdateDto = plainToInstance(UpdateWorkOrderActualCostDto, {
      notes: ' Ajuste manual ',
    });

    const errors = await validate(invalidCreateDto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['supplierId']),
    );
    expect(validUpdateDto.notes).toBe('Ajuste manual');
    await expect(validate(validUpdateDto)).resolves.toHaveLength(0);
  });
});
