import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EstimateLineType } from '../../../generated/prisma/enums';
import { UpsertWorkOrderEstimateDto } from './upsert-work-order-estimate.dto';

describe('upsert work-order estimate DTO contracts', () => {
  it('accepts decimal labor hours and trims linked line strings', async () => {
    const dto = plainToInstance(UpsertWorkOrderEstimateDto, {
      estimatedLaborHours: '1.5',
      baseCostAmount: '120000',
      totalCostAmount: '150000',
      totalPriceAmount: '220000',
      notes: ' Estimación inicial ',
      lines: [
        {
          lineType: EstimateLineType.PART,
          description: ' Rodamiento delantero ',
          inventoryItemId: ' inventory-1 ',
          supplierId: ' supplier-1 ',
          supplierQuoteHistoryId: ' quote-1 ',
          quantity: '2',
          unitCost: '60000',
          unitPrice: '95000',
        },
      ],
    });

    expect(dto.estimatedLaborHours).toBe(1.5);
    expect(dto.notes).toBe('Estimación inicial');
    expect(dto.lines?.[0]).toMatchObject({
      description: 'Rodamiento delantero',
      inventoryItemId: 'inventory-1',
      supplierId: 'supplier-1',
      supplierQuoteHistoryId: 'quote-1',
      quantity: 2,
      unitCost: 60000,
      unitPrice: 95000,
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects labor hours with more than two decimal places', async () => {
    const dto = plainToInstance(UpsertWorkOrderEstimateDto, {
      estimatedLaborHours: '1.234',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['estimatedLaborHours']),
    );
  });
});
