import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  OptionalTrimmedString,
  TrimmedString,
} from '../../customers/dto/customer-string.transforms';
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

  @ApiPropertyOptional({ example: '<p>Blindaje nivel 1</p>' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  notes?: string;
}
