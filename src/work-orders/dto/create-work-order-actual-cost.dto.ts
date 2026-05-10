import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod, WorkOrderCostCategory } from '../../../generated/prisma/enums';
import { OptionalTrimmedString, TrimmedString } from '../../common/transforms/string.transforms';

const workOrderCostCategories = Object.values(WorkOrderCostCategory);
const paymentMethods = Object.values(PaymentMethod);

export class CreateWorkOrderActualCostDto {
  @ApiProperty({ enum: workOrderCostCategories, example: 'DIRECT_PURCHASE' })
  @IsIn(workOrderCostCategories)
  category!: WorkOrderCostCategory;

  @ApiProperty({ example: 'Compra de rodamiento' })
  @TrimmedString()
  @IsString()
  description!: string;

  @ApiProperty({ example: 150000, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount!: number;

  @ApiProperty({ example: '2026-05-10T13:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  incurredAt!: Date;

  @ApiPropertyOptional({ enum: paymentMethods, example: 'TRANSFER' })
  @IsOptional()
  @IsIn(paymentMethods)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'supplier-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ example: 'inventory-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  inventoryItemId?: string;

  @ApiPropertyOptional({ example: 'quote-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  supplierQuoteHistoryId?: string;

  @ApiPropertyOptional({ example: 'Compra urgente' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  notes?: string;
}
