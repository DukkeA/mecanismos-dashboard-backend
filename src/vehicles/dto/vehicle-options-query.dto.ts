import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { OptionsQueryDto } from '../../common/reference-data';
import { OptionalTrimmedString } from '../../common/transforms/string.transforms';

export class VehicleOptionsQueryDto extends OptionsQueryDto {
  @ApiPropertyOptional({ example: 'customer-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  customerId?: string;
}
