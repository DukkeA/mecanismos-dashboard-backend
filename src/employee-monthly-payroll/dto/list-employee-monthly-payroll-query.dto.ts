import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

const employeeMonthlyPayrollStatuses = ['DRAFT', 'FINALIZED'] as const;

export class ListEmployeeMonthlyPayrollQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({ example: 2026, minimum: 1000, maximum: 9999 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(9999)
  year?: number;

  @ApiPropertyOptional({
    enum: employeeMonthlyPayrollStatuses,
    example: 'FINALIZED',
  })
  @IsOptional()
  @IsIn(employeeMonthlyPayrollStatuses)
  status?: (typeof employeeMonthlyPayrollStatuses)[number];
}
