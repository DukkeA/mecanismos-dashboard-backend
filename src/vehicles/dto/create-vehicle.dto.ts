import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TrimmedString } from '../../common/transforms/string.transforms';
import {
  LexicalNoteJson,
  OptionalLexicalNote,
} from '../../common/rich-text/lexical-note';
import { Transform, Type } from 'class-transformer';
import { ValidateIf, ValidateNested } from 'class-validator';
import { CreateCustomerDto } from '../../customers/dto/create-customer.dto';

function BrandName() {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'object' && value !== null && 'name' in value) {
      const name = (value as { name?: unknown }).name;
      return typeof name === 'string' ? name.trim() : name;
    }
    return typeof value === 'string' ? value.trim() : value;
  });
}

function UppercasePlate() {
  return Transform(({ value }: { value: unknown }) => {
    return typeof value === 'string' ? value.trim().toUpperCase() : value;
  });
}

export class CreateVehicleDto {
  @ApiPropertyOptional({ example: 'customer-1' })
  @ValidateIf((payload: CreateVehicleDto) => payload.customer === undefined)
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  customerId?: string;

  @ApiPropertyOptional({ type: CreateCustomerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCustomerDto)
  customer?: CreateCustomerDto;

  @ApiPropertyOptional({ example: 'brand-1' })
  @IsOptional()
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  brandId?: string;

  @ApiPropertyOptional({ example: 'Mazda' })
  @ValidateIf((payload: CreateVehicleDto) => payload.brandId === undefined && payload.brandName === undefined)
  @BrandName()
  @IsString()
  @IsNotEmpty()
  brand?: string;

  @ApiPropertyOptional({ example: 'Mazda' })
  @IsOptional()
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  brandName?: string;

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

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
