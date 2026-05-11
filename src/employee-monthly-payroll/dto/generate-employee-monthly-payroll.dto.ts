import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class GenerateEmployeeMonthlyPayrollDto {
  @ApiProperty({ example: 2026, minimum: 1000, maximum: 9999 })
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(9999)
  year!: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}
