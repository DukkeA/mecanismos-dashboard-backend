import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  OptionalTrimmedString,
  TrimmedString,
} from '../../common/transforms/string.transforms';

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
  @ApiProperty({ example: 'customer-1' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({ example: 'component-type-1' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  componentTypeId!: string;

  @ApiPropertyOptional({ example: 'vehicle-1' })
  @IsOptional()
  @OptionalVehicleId()
  @IsString()
  vehicleId?: string | null;

  @ApiProperty({ example: 'Bosch' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  brand!: string;

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

  @ApiPropertyOptional({ example: '<p>Alternador reemplazado</p>' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  notes?: string;
}
