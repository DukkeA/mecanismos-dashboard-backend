import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { EstimateLineType } from '../../../generated/prisma/enums';
import {
  OptionalTrimmedString,
  TrimmedString,
} from '../../common/transforms/string.transforms';
import {
  LexicalNoteJson,
  OptionalLexicalNote,
} from '../../common/rich-text/lexical-note';

const estimateLineTypes = Object.values(EstimateLineType);

export class UpsertWorkOrderEstimateLineDto {
  @ApiProperty({ enum: estimateLineTypes, example: 'PART' })
  @IsIn(estimateLineTypes)
  lineType!: EstimateLineType;

  @ApiProperty({ example: 'Rodamiento delantero' })
  @TrimmedString()
  @IsString()
  description!: string;

  @ApiPropertyOptional({ example: 'inventory-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  inventoryItemId?: string;

  @ApiPropertyOptional({ example: 'service-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  serviceCatalogId?: string;

  @ApiPropertyOptional({ example: 'supplier-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ example: 'quote-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  supplierQuoteHistoryId?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: 150000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ example: 220000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPrice?: number;

  @OptionalLexicalNote()
  notes?: LexicalNoteJson | null;
}

export class UpsertWorkOrderEstimateDto {
  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  estimatedLaborHours?: number;

  @ApiPropertyOptional({ example: 300000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  baseCostAmount?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  contingencyPct?: number;

  @ApiPropertyOptional({ example: 50000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  laborHourlyCostSnapshot?: number;

  @ApiPropertyOptional({ example: 330000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalCostAmount?: number;

  @ApiPropertyOptional({ example: 450000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalPriceAmount?: number;

  @ApiPropertyOptional({ example: 390000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  recommendedMinimumPrice?: number;

  @ApiPropertyOptional({ example: 450000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  recommendedPrice?: number;

  @ApiPropertyOptional({ example: 520000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  recommendedHighPrice?: number;

  @OptionalLexicalNote()
  notes?: LexicalNoteJson | null;

  @ApiPropertyOptional({ type: () => [UpsertWorkOrderEstimateLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertWorkOrderEstimateLineDto)
  lines?: UpsertWorkOrderEstimateLineDto[];
}
