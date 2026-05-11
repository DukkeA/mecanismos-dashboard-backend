import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { WorkOrderCostCategory } from '../../../generated/prisma/enums';
import {
  ConsumeWorkOrderInventoryDto,
  ReleaseWorkOrderInventoryDto,
  ReserveWorkOrderInventoryDto,
  SellWorkOrderInventoryDto,
} from '../dto/work-order-inventory-action.dto';
import {
  WorkOrderInventoryReservationConflictError,
  WorkOrderInventoryStockConflictError,
  WorkOrdersRepository,
} from '../persistence/work-orders.repository';
import { itemSupportsPhysicalStockLedger } from '../../inventory/stock.helpers';
import { WorkOrderReadModelService } from './work-order-read-model.service';
import { WorkOrderRelationsService } from './work-order-relations.service';

@Injectable()
export class WorkOrderInventoryService {
  constructor(
    private readonly workOrdersRepository: WorkOrdersRepository,
    private readonly workOrderReadModelService: WorkOrderReadModelService,
    private readonly workOrderRelationsService: WorkOrderRelationsService,
  ) {}

  async reserve(id: string, dto: ReserveWorkOrderInventoryDto) {
    return this.runAction(id, dto, {
      movementType: 'OUT',
      isReservedForWorkOrder: true,
    });
  }

  async release(id: string, dto: ReleaseWorkOrderInventoryDto) {
    return this.runAction(id, dto, {
      movementType: 'IN',
      isReservedForWorkOrder: false,
    });
  }

  async consume(id: string, dto: ConsumeWorkOrderInventoryDto) {
    return this.runAction(id, dto, {
      movementType: 'OUT',
      isReservedForWorkOrder: false,
      actualCost: buildActualCostPayload(dto, 'Consumo de inventario'),
    });
  }

  async sell(id: string, dto: SellWorkOrderInventoryDto) {
    return this.runAction(id, dto, {
      movementType: 'OUT',
      isReservedForWorkOrder: false,
      actualCost: buildActualCostPayload(dto, 'Venta de inventario'),
    });
  }

  private async runAction(
    workOrderId: string,
    dto:
      | ReserveWorkOrderInventoryDto
      | ReleaseWorkOrderInventoryDto
      | ConsumeWorkOrderInventoryDto
      | SellWorkOrderInventoryDto,
    input: {
      movementType: 'IN' | 'OUT';
      isReservedForWorkOrder: boolean;
      actualCost?: ReturnType<typeof buildActualCostPayload>;
    },
  ) {
    await this.workOrderReadModelService.findOne(workOrderId);
    const relations =
      await this.workOrderRelationsService.assertInventoryActionRelations(
        workOrderId,
        dto,
      );

    if (
      !itemSupportsPhysicalStockLedger(
        relations.inventoryItem?.itemType as never,
      )
    ) {
      throw new BadRequestException(
        'Demand-purchased items do not allow physical stock movements',
      );
    }

    try {
      return await this.workOrdersRepository.createInventoryAction(
        workOrderId,
        {
          inventoryItemId: dto.inventoryItemId,
          movementType: input.movementType,
          movementReason: dto.reason,
          quantity: dto.quantity,
          occurredAt: dto.occurredAt,
          supplierId: dto.supplierId,
          unitCost: 'unitCost' in dto ? dto.unitCost : undefined,
          notes: dto.notes,
          isReservedForWorkOrder: input.isReservedForWorkOrder,
          actualCost: input.actualCost,
        },
      );
    } catch (error) {
      if (error instanceof WorkOrderInventoryStockConflictError) {
        throw new ConflictException(
          `Inventory action would exceed available stock from ${error.currentAvailableStock}`,
        );
      }

      if (error instanceof WorkOrderInventoryReservationConflictError) {
        throw new ConflictException(
          `Cannot release ${error.attemptedQuantity} units when only ${error.currentReservedQuantity} are reserved`,
        );
      }

      throw error;
    }
  }
}

function buildActualCostPayload(
  dto: ConsumeWorkOrderInventoryDto | SellWorkOrderInventoryDto,
  fallbackDescription: string,
) {
  const amount = dto.actualCostAmount ?? deriveActualCostAmount(dto);

  if (amount === undefined) {
    return undefined;
  }

  return {
    category: WorkOrderCostCategory.DIRECT_PURCHASE,
    description: dto.actualCostDescription?.trim() || fallbackDescription,
    amount,
    supplierId: dto.supplierId,
    inventoryItemId: dto.inventoryItemId,
    supplierQuoteHistoryId: dto.supplierQuoteHistoryId,
    paymentMethod: dto.actualCostPaymentMethod,
    incurredAt: dto.occurredAt,
    notes: dto.notes,
  };
}

function deriveActualCostAmount(
  dto: ConsumeWorkOrderInventoryDto | SellWorkOrderInventoryDto,
) {
  return dto.unitCost !== undefined ? dto.unitCost * dto.quantity : undefined;
}
