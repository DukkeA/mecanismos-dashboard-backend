import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import {
  OptionalTrimmedString,
  TrimmedString,
} from '../../common/transforms/string.transforms';
import {
  LexicalNoteJson,
  OptionalLexicalNote,
} from '../../common/rich-text/lexical-note';
import { Transform } from 'class-transformer';

function UppercasePlate() {
  return Transform(({ value }: { value: unknown }) => {
    return typeof value === 'string' ? value.trim().toUpperCase() : value;
  });
}

export class CreateVehicleDto {
  @ApiProperty({ example: 'customer-1' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({ example: 'Mazda' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  brand!: string;

  @ApiProperty({ example: 'CX5' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  modelReference!: string;

  @ApiProperty({ example: 'ABC123' })
  @UppercasePlate()
  @IsString()
  @IsNotEmpty()
  plate!: string;

  @OptionalLexicalNote()
  notes?: LexicalNoteJson | null;
}
