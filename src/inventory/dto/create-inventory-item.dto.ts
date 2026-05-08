import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  InventoryCondition,
  InventoryItemType,
} from '../../../generated/prisma/enums';
import {
  OptionalTrimmedString,
  TrimmedString,
} from '../../common/transforms/string.transforms';

const inventoryItemTypes = Object.values(InventoryItemType);
const inventoryConditions = Object.values(InventoryCondition);

export class CreateInventoryItemDto {
  @ApiProperty({ example: 'Inyector Bosch 0445120231' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: inventoryItemTypes, example: 'STOCK_OWNED' })
  @IsIn(inventoryItemTypes)
  itemType!: InventoryItemType;

  @ApiPropertyOptional({ enum: inventoryConditions, example: 'NEW' })
  @IsOptional()
  @IsIn(inventoryConditions)
  condition?: InventoryCondition;

  @ApiPropertyOptional({ example: 'Bosch' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: '0445120231' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'INV-001' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  identifier?: string;

  @ApiPropertyOptional({ example: '<p>Línea de uso frecuente</p>' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 2, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumStock?: number;

  @ApiPropertyOptional({ example: 250000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  defaultSalePrice?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
