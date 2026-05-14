import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import {
  OptionalTrimmedString,
  TrimmedString,
} from '../../common/transforms/string.transforms';
import {
  LexicalNoteJson,
  OptionalLexicalNote,
} from '../../common/rich-text/lexical-note';

export class SupplierPhoneDto {
  @ApiPropertyOptional({ example: 'Principal' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  label?: string;

  @ApiProperty({ example: '3001234567' })
  @TrimmedString()
  @IsString()
  phone!: string;

  @ApiProperty({ example: true })
  @Type(() => Boolean)
  @IsBoolean()
  isPrimary!: boolean;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasWhatsapp?: boolean;

  @OptionalLexicalNote()
  notes?: LexicalNoteJson | null;
}
