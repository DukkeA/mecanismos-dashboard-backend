import type {
  InventoryItemType,
  InventoryMovementType,
} from '../../generated/prisma/enums';

export type MovementAggregate = {
  inventoryItemId: string;
  movementType: InventoryMovementType;
  _sum: {
    quantity: number | null;
  };
};

export function calculateCurrentStock(aggregates: MovementAggregate[]): number {
  return aggregates.reduce((total, aggregate) => {
    const quantity = aggregate._sum.quantity ?? 0;
    return total + toMovementDelta(aggregate.movementType, quantity);
  }, 0);
}

export function calculateCurrentStockMap(aggregates: MovementAggregate[]) {
  return aggregates.reduce<Record<string, number>>(
    (stockByItemId, aggregate) => {
      const quantity = aggregate._sum.quantity ?? 0;
      const currentStock = stockByItemId[aggregate.inventoryItemId] ?? 0;

      stockByItemId[aggregate.inventoryItemId] =
        currentStock + toMovementDelta(aggregate.movementType, quantity);

      return stockByItemId;
    },
    {},
  );
}

export function toMovementDelta(
  movementType: InventoryMovementType,
  quantity: number,
): number {
  if (movementType === 'OUT') {
    return quantity * -1;
  }

  return quantity;
}

export function itemSupportsPhysicalStockLedger(itemType: InventoryItemType) {
  return itemType !== 'DEMAND_PURCHASED';
}
