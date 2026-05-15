import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ActiveOptionsQueryDto } from '../../common/reference-data';
import { OptionalTrimmedString } from '../../common/transforms/string.transforms';

export class VehicleOptionsQueryDto extends ActiveOptionsQueryDto {
  @ApiPropertyOptional({ example: 'customer-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  customerId?: string;
}
