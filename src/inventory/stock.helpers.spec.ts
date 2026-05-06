import {
  calculateCurrentStock,
  calculateCurrentStockMap,
} from './stock.helpers';

describe('stock.helpers', () => {
  it('derives stock from mixed in and out movement aggregates', () => {
    expect(
      calculateCurrentStock([
        {
          inventoryItemId: 'item-1',
          movementType: 'IN',
          _sum: { quantity: 5 },
        },
        {
          inventoryItemId: 'item-1',
          movementType: 'OUT',
          _sum: { quantity: 2 },
        },
      ]),
    ).toBe(3);
  });

  it('builds a per-item stock map for paginated item responses', () => {
    expect(
      calculateCurrentStockMap([
        {
          inventoryItemId: 'item-1',
          movementType: 'IN',
          _sum: { quantity: 4 },
        },
        {
          inventoryItemId: 'item-2',
          movementType: 'IN',
          _sum: { quantity: 1 },
        },
        {
          inventoryItemId: 'item-2',
          movementType: 'OUT',
          _sum: { quantity: 1 },
        },
      ]),
    ).toEqual({
      'item-1': 4,
      'item-2': 0,
    });
  });
});
