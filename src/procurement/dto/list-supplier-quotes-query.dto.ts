import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { SupplierQuoteStatus } from '../../../generated/prisma/enums';
import { OptionalTrimmedString } from '../../customers/dto/customer-string.transforms';

const supplierQuoteStatuses = Object.values(SupplierQuoteStatus);

export class ListSupplierQuotesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({ example: 'bosch' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: supplierQuoteStatuses, example: 'ACTIVE' })
  @IsOptional()
  @IsIn(supplierQuoteStatuses)
  status?: SupplierQuoteStatus;

  @ApiPropertyOptional({ example: 'seed-inventory-item-bosch-inyector' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  inventoryItemId?: string;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  quotedFrom?: Date;

  @ApiPropertyOptional({ example: '2026-05-31T23:59:59.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  quotedTo?: Date;
}
