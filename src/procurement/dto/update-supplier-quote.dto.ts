import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, Min } from 'class-validator';
import {
  OptionalTrimmedString,
  TrimmedString,
} from '../../customers/dto/customer-string.transforms';

export class UpdateSupplierQuoteDto {
  @ApiPropertyOptional({ example: 182000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quotedCost?: number;

  @ApiPropertyOptional({ example: '2026-05-06T11:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  quotedAt?: Date;

  @ApiProperty({ example: 'Corrección por valor digitado incompleto' })
  @TrimmedString()
  @IsString()
  correctionReason!: string;

  @ApiPropertyOptional({ example: 'El proveedor confirmó IVA incluido' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  notes?: string;
}
