import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, Min } from 'class-validator';
import {
  TrimmedString,
} from '../../common/transforms/string.transforms';
import {
  LexicalNoteJson,
  OptionalLexicalNote,
} from '../../common/rich-text/lexical-note';

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

  @OptionalLexicalNote()
  notes?: LexicalNoteJson | null;
}
