import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { OptionsQueryDto } from '../../common/reference-data';
import { OptionalTrimmedString } from '../../common/transforms/string.transforms';

export class ComponentOptionsQueryDto extends OptionsQueryDto {
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
