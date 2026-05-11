type InventoryActivityMovement = {
  id: string;
  inventoryItemId: string;
  movementType: string;
  reason: string;
  quantity: number;
  unitCost: number | null;
  supplierId: string | null;
  workOrderId: string | null;
  isReservedForWorkOrder: boolean;
  occurredAt: Date;
  notes: string | null;
  createdAt?: Date;
  InventoryItem?: {
    id: string;
    name: string;
    reference: string | null;
    identifier: string | null;
    defaultSalePrice: number | null;
    isActive: boolean | null;
    itemType?: string | null;
  } | null;
};

type InventoryActivityCost = {
  id: string;
  inventoryItemId: string | null;
};

export function isReservationMovement(movement: InventoryActivityMovement) {
  return (
    movement.movementType === 'OUT' &&
    movement.reason === 'WORK_ORDER_PURCHASE' &&
    movement.isReservedForWorkOrder
  );
}

export function isReservationReleaseMovement(
  movement: InventoryActivityMovement,
) {
  return (
    movement.movementType === 'IN' &&
    movement.reason === 'RETURN' &&
    movement.workOrderId !== null
  );
}

export function calculatePhysicalStockFromMovements(
  movements: InventoryActivityMovement[],
) {
  return movements.reduce((total, movement) => {
    if (
      isReservationMovement(movement) ||
      isReservationReleaseMovement(movement)
    ) {
      return total;
    }

    return (
      total +
      (movement.movementType === 'OUT'
        ? movement.quantity * -1
        : movement.quantity)
    );
  }, 0);
}

export function calculateActiveReservationQuantity(
  movements: InventoryActivityMovement[],
  workOrderId: string,
) {
  return movements.reduce((total, movement) => {
    if (movement.workOrderId !== workOrderId) {
      return total;
    }

    if (isReservationMovement(movement)) {
      return total + movement.quantity;
    }

    if (
      isReservationReleaseMovement(movement) ||
      (movement.movementType === 'OUT' &&
        (movement.reason === 'WORK_ORDER_CONSUMPTION' ||
          movement.reason === 'SALE'))
    ) {
      return total - movement.quantity;
    }

    return total;
  }, 0);
}

export function calculateAvailableStockForWorkOrder(
  movements: InventoryActivityMovement[],
  workOrderId: string,
) {
  const physicalStock = calculatePhysicalStockFromMovements(movements);
  const reservedByWorkOrder = new Map<string, number>();

  for (const movement of movements) {
    if (!movement.workOrderId) {
      continue;
    }

    reservedByWorkOrder.set(
      movement.workOrderId,
      calculateActiveReservationQuantity(movements, movement.workOrderId),
    );
  }

  const totalReserved = Array.from(reservedByWorkOrder.values()).reduce(
    (sum, reserved) => sum + Math.max(reserved, 0),
    0,
  );
  const currentReserved = Math.max(
    calculateActiveReservationQuantity(movements, workOrderId),
    0,
  );

  return physicalStock - totalReserved + currentReserved;
}

export function buildWorkOrderInventoryActivity(
  movements: InventoryActivityMovement[],
  actualCosts: InventoryActivityCost[],
) {
  const activityByItem = new Map<
    string,
    {
      inventoryItemId: string;
      itemName: string;
      sku: string | null;
      reference: string | null;
      identifier: string | null;
      defaultSalePrice: number | null;
      activeReservedQuantity: number;
      consumedQuantity: number;
      soldQuantity: number;
      actualCostIds: string[];
      movements: Array<{
        id: string;
        inventoryItemId: string;
        movementType: string;
        reason: string;
        quantity: number;
        unitCost: number | null;
        supplierId: string | null;
        workOrderId: string | null;
        isReservedForWorkOrder: boolean;
        occurredAt: Date;
        notes: string | null;
        actualCostId: string | null;
      }>;
    }
  >();

  for (const movement of movements) {
    const current = activityByItem.get(movement.inventoryItemId) ?? {
      inventoryItemId: movement.inventoryItemId,
      itemName: movement.InventoryItem?.name ?? movement.inventoryItemId,
      sku:
        movement.InventoryItem?.reference ??
        movement.InventoryItem?.identifier ??
        null,
      reference: movement.InventoryItem?.reference ?? null,
      identifier: movement.InventoryItem?.identifier ?? null,
      defaultSalePrice: movement.InventoryItem?.defaultSalePrice ?? null,
      activeReservedQuantity: 0,
      consumedQuantity: 0,
      soldQuantity: 0,
      actualCostIds: [],
      movements: [],
    };

    if (isReservationMovement(movement)) {
      current.activeReservedQuantity += movement.quantity;
    }
    if (isReservationReleaseMovement(movement)) {
      current.activeReservedQuantity -= movement.quantity;
    }
    if (
      movement.movementType === 'OUT' &&
      movement.reason === 'WORK_ORDER_CONSUMPTION'
    ) {
      current.consumedQuantity += movement.quantity;
      current.activeReservedQuantity -= movement.quantity;
    }
    if (movement.movementType === 'OUT' && movement.reason === 'SALE') {
      current.soldQuantity += movement.quantity;
      current.activeReservedQuantity -= movement.quantity;
    }

    current.movements.push({
      id: movement.id,
      inventoryItemId: movement.inventoryItemId,
      movementType: movement.movementType,
      reason: movement.reason,
      quantity: movement.quantity,
      unitCost: movement.unitCost,
      supplierId: movement.supplierId,
      workOrderId: movement.workOrderId,
      isReservedForWorkOrder: movement.isReservedForWorkOrder,
      occurredAt: movement.occurredAt,
      notes: movement.notes,
      actualCostId: null,
    });

    activityByItem.set(movement.inventoryItemId, current);
  }

  for (const actualCost of actualCosts) {
    if (!actualCost.inventoryItemId) {
      continue;
    }

    const current = activityByItem.get(actualCost.inventoryItemId);
    if (!current) {
      continue;
    }

    current.actualCostIds.push(actualCost.id);
  }

  return Array.from(activityByItem.values()).map((activity) => ({
    ...activity,
    activeReservedQuantity: Math.max(activity.activeReservedQuantity, 0),
    movements: activity.movements.sort(
      (left, right) => left.occurredAt.getTime() - right.occurredAt.getTime(),
    ),
  }));
}
