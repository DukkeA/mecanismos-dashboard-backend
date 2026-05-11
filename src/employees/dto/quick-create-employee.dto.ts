import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { CreateEmployeeDto } from './create-employee.dto';

export class QuickCreateEmployeeDto extends OmitType(CreateEmployeeDto, [
  'baseSalaryMonthly',
] as const) {
  @ApiPropertyOptional({
    example: 0,
    minimum: 0,
    description:
      'Optional in quick-create; defaults to 0 until payroll profile is completed.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  declare baseSalaryMonthly?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  declare isActive?: boolean;
}
