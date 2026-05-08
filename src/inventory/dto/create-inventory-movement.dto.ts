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
  InventoryMovementType,
} from '../../../generated/prisma/enums';
import { OptionalTrimmedString } from '../../common/transforms/string.transforms';

const inventoryMovementTypes = Object.values(InventoryMovementType).filter(
  (movementType) => movementType !== 'ADJUSTMENT',
);
const inventoryMovementReasons = Object.values(InventoryMovementReason);

export class CreateInventoryMovementDto {
  @ApiProperty({ enum: inventoryMovementTypes, example: 'IN' })
  @IsIn(inventoryMovementTypes)
  movementType!: InventoryMovementType;

  @ApiProperty({ enum: inventoryMovementReasons, example: 'PURCHASE' })
  @IsIn(inventoryMovementReasons)
  reason!: InventoryMovementReason;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 180000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ example: 'seed-supplier-repuestos-central-main' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  supplierId?: string;

  @ApiProperty({ example: '2026-05-06T10:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  occurredAt!: Date;

  @ApiPropertyOptional({ example: 'Ingreso por compra urgente' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  notes?: string;
}
