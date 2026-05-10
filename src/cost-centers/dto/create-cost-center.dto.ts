import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TrimmedString } from '../../common/transforms/string.transforms';

export class CreateCostCenterDto {
  @ApiProperty({ example: 'GENERAL' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'General' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
