import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  InventoryMovementReason,
  PaymentMethod,
} from '../../../generated/prisma/enums';
import {
  OptionalTrimmedString,
  TrimmedString,
} from '../../common/transforms/string.transforms';

const reserveReasons = [InventoryMovementReason.WORK_ORDER_PURCHASE] as const;
const releaseReasons = [InventoryMovementReason.RETURN] as const;
const consumeReasons = [
  InventoryMovementReason.WORK_ORDER_CONSUMPTION,
] as const;
const sellReasons = [InventoryMovementReason.SALE] as const;
const paymentMethods = Object.values(PaymentMethod);

class BaseWorkOrderInventoryDto {
  @ApiProperty({ example: 'seed-inventory-item-bosch-inyector' })
  @TrimmedString()
  @IsString()
  inventoryItemId!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: '2026-05-11T10:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  occurredAt!: Date;

  @ApiPropertyOptional({ example: 'seed-supplier-repuestos-central-main' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ example: 'seed-supplier-quote-bosch-central-v1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  supplierQuoteHistoryId?: string;

  @ApiPropertyOptional({
    example: 'Movimiento creado desde la orden de trabajo',
  })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  notes?: string;
}

class CostAwareWorkOrderInventoryDto extends BaseWorkOrderInventoryDto {
  @ApiPropertyOptional({ example: 180000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ example: 180000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  actualCostAmount?: number;

  @ApiPropertyOptional({ example: 'Costo real asociado al consumo' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  actualCostDescription?: string;

  @ApiPropertyOptional({
    enum: paymentMethods,
    example: PaymentMethod.TRANSFER,
  })
  @IsOptional()
  @IsIn(paymentMethods)
  actualCostPaymentMethod?: PaymentMethod;
}

export class ReserveWorkOrderInventoryDto extends BaseWorkOrderInventoryDto {
  @ApiProperty({
    enum: reserveReasons,
    example: InventoryMovementReason.WORK_ORDER_PURCHASE,
  })
  @IsIn(reserveReasons)
  reason!: InventoryMovementReason;
}

export class ReleaseWorkOrderInventoryDto extends BaseWorkOrderInventoryDto {
  @ApiProperty({
    enum: releaseReasons,
    example: InventoryMovementReason.RETURN,
  })
  @IsIn(releaseReasons)
  reason!: InventoryMovementReason;
}

export class ConsumeWorkOrderInventoryDto extends CostAwareWorkOrderInventoryDto {
  @ApiProperty({
    enum: consumeReasons,
    example: InventoryMovementReason.WORK_ORDER_CONSUMPTION,
  })
  @IsIn(consumeReasons)
  reason!: InventoryMovementReason;
}

export class SellWorkOrderInventoryDto extends CostAwareWorkOrderInventoryDto {
  @ApiProperty({ enum: sellReasons, example: InventoryMovementReason.SALE })
  @IsIn(sellReasons)
  reason!: InventoryMovementReason;
}
