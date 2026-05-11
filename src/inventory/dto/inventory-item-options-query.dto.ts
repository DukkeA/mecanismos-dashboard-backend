import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import {
  InventoryCondition,
  InventoryItemType,
} from '../../../generated/prisma/enums';
import { ActiveOptionsQueryDto } from '../../common/reference-data';

const inventoryItemTypes = Object.values(InventoryItemType);
const inventoryConditions = Object.values(InventoryCondition);

export class InventoryItemOptionsQueryDto extends ActiveOptionsQueryDto {
  @ApiPropertyOptional({ enum: inventoryItemTypes, example: 'STOCK_OWNED' })
  @IsOptional()
  @IsIn(inventoryItemTypes)
  itemType?: InventoryItemType;

  @ApiPropertyOptional({ enum: inventoryConditions, example: 'NEW' })
  @IsOptional()
  @IsIn(inventoryConditions)
  condition?: InventoryCondition;
}
