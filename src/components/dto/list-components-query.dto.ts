import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { OptionalTrimmedString } from '../../customers/dto/customer-string.transforms';

export class ListComponentsQueryDto {
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

  @ApiPropertyOptional({ example: 'customer-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: 'vehicle-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ example: 'component-type-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  componentTypeId?: string;
}
