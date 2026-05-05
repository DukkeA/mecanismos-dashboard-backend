import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  OptionalTrimmedString,
  TrimmedString,
} from '../../customers/dto/customer-string.transforms';

export class CreateComponentTypeDto {
  @ApiProperty({ example: 'Bomba de inyección' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'bomba-de-inyeccion' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'Bombas diesel para banco y taller.' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
