import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, Min } from 'class-validator';
import {
  OptionalTrimmedString,
  TrimmedString,
} from '../../common/transforms/string.transforms';
import {
  LexicalNoteJson,
  OptionalLexicalNote,
} from '../../common/rich-text/lexical-note';

export class CreateSupplierQuoteDto {
  @ApiProperty({ example: 'seed-supplier-repuestos-central-main' })
  @TrimmedString()
  @IsString()
  supplierId!: string;

  @ApiProperty({ example: 'seed-inventory-item-bosch-inyector' })
  @TrimmedString()
  @IsString()
  inventoryItemId!: string;

  @ApiProperty({ example: 180000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quotedCost!: number;

  @ApiProperty({ example: '2026-05-06T10:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  quotedAt!: Date;

  @OptionalLexicalNote()
  notes?: LexicalNoteJson | null;
}
