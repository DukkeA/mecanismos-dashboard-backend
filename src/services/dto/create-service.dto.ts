import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  OptionalTrimmedString,
  TrimmedString,
} from '../../customers/dto/customer-string.transforms';

export class CreateServiceDto {
  @ApiProperty({ example: 'Diagnóstico electrónico' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Lectura de fallas y validación inicial.' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
