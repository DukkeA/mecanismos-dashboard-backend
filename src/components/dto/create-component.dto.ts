import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';
import {
  OptionalTrimmedString,
  TrimmedString,
} from '../../common/transforms/string.transforms';
import {
  LexicalNoteJson,
  OptionalLexicalNote,
} from '../../common/rich-text/lexical-note';
import { CreateCustomerDto } from '../../customers/dto/create-customer.dto';

export class InlineComponentTypeDto {
  @ApiProperty({ example: 'Alternador' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'alternador' })
  @IsOptional()
  @TrimmedString()
  @IsString()
  slug?: string;
}

export class InlineVehicleDto {
  @ApiPropertyOptional({ example: 'brand-1' })
  @IsOptional()
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  brandId?: string;

  @ApiPropertyOptional({ example: 'Mazda' })
  @ValidateIf((payload: InlineVehicleDto) => payload.brandId === undefined && payload.brandName === undefined)
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

  @ApiProperty({ example: 'BT-50' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  modelReference!: string;

  @ApiProperty({ example: 'XYZ987' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
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

function BrandName() {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'object' && value !== null && 'name' in value) {
      const name = (value as { name?: unknown }).name;
      return typeof name === 'string' ? name.trim() : name;
    }
    return typeof value === 'string' ? value.trim() : value;
  });
}

function OptionalVehicleId() {
  return Transform(({ value }: { value: unknown }) => {
    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      return value;
    }

    const normalized = value.trim();

    return normalized.length > 0 ? normalized : undefined;
  });
}

export class CreateComponentDto {
  @ApiPropertyOptional({ example: 'customer-1' })
  @ValidateIf((payload: CreateComponentDto) => payload.customer === undefined)
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  customerId?: string;

  @ApiPropertyOptional({ type: CreateCustomerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCustomerDto)
  customer?: CreateCustomerDto;

  @ApiPropertyOptional({ example: 'component-type-1' })
  @ValidateIf((payload: CreateComponentDto) => payload.componentType === undefined)
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  componentTypeId?: string;

  @ApiPropertyOptional({ type: InlineComponentTypeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InlineComponentTypeDto)
  componentType?: InlineComponentTypeDto;

  @ApiPropertyOptional({ example: 'vehicle-1' })
  @IsOptional()
  @OptionalVehicleId()
  @IsString()
  vehicleId?: string | null;

  @ApiPropertyOptional({ type: InlineVehicleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InlineVehicleDto)
  vehicle?: InlineVehicleDto;

  @ApiPropertyOptional({ example: 'brand-1' })
  @IsOptional()
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  brandId?: string;

  @ApiPropertyOptional({ example: 'Bosch' })
  @ValidateIf((payload: CreateComponentDto) => payload.brandId === undefined && payload.brandName === undefined)
  @BrandName()
  @IsString()
  @IsNotEmpty()
  brand?: string;

  @ApiPropertyOptional({ example: 'Bosch' })
  @IsOptional()
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  brandName?: string;

  @ApiProperty({ example: 'ALT-90A' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  reference!: string;

  @ApiPropertyOptional({ example: 'SER-100' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  identifier?: string;

  @OptionalLexicalNote()
  notes?: LexicalNoteJson | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
