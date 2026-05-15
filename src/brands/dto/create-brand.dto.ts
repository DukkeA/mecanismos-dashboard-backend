import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TrimmedString } from '../../common/transforms/string.transforms';

export class CreateBrandDto {
  @ApiProperty({ example: 'Bosch' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
