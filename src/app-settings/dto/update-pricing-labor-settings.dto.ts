import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UpdatePricingLaborSettingsDto {
  @ApiPropertyOptional({ example: 'COP', pattern: '^[A-Z]{3}$' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string;

  @ApiPropertyOptional({ example: 176, minimum: 1, maximum: 744 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(744)
  monthlyWorkingHours?: number;

  @ApiPropertyOptional({ example: 50000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  defaultLaborHourlyRate?: number;

  @ApiPropertyOptional({ example: 5, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  saleContingencyPct?: number;

  @ApiPropertyOptional({ example: 10, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  workshopContingencyPct?: number;

  @ApiPropertyOptional({ example: 20, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  diagnosticContingencyPct?: number;

  @ApiPropertyOptional({ example: 20, minimum: 0, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  minimumMarkupPct?: number;

  @ApiPropertyOptional({ example: 35, minimum: 0, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  recommendedMarkupPct?: number;

  @ApiPropertyOptional({ example: 50, minimum: 0, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  highMarkupPct?: number;
}
