import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { EmployeeType } from '../../../generated/prisma/enums';
import {
  OptionalTrimmedString,
  TrimmedString,
} from '../../common/transforms/string.transforms';

const employeeTypes = Object.values(EmployeeType);

export class CreateEmployeeDto {
  @ApiProperty({ example: 'Ana Torres' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: employeeTypes, example: 'MECHANIC' })
  @IsIn(employeeTypes)
  type!: EmployeeType;

  @ApiPropertyOptional({ example: '3001234567' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 2500000, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  baseSalaryMonthly!: number;

  @ApiPropertyOptional({ example: 'cost-center-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  costCenterId?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
