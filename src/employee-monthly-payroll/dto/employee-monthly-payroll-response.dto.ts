import { ApiProperty } from '@nestjs/swagger';
import { EmployeeType } from '../../../generated/prisma/enums';

export class EmployeeMonthlyPayrollLineResponseDto {
  @ApiProperty({ example: 'payroll-line-1' })
  id!: string;

  @ApiProperty({ example: 'seed-employee-ana-torres', nullable: true })
  employeeId!: string | null;

  @ApiProperty({ example: 'Ana Torres' })
  employeeName!: string;

  @ApiProperty({ enum: Object.values(EmployeeType), example: EmployeeType.MECHANIC })
  employeeType!: EmployeeType;

  @ApiProperty({ example: 'cost-center-general', nullable: true })
  costCenterId!: string | null;

  @ApiProperty({ example: 'GENERAL', nullable: true })
  costCenterCode!: string | null;

  @ApiProperty({ example: 'General', nullable: true })
  costCenterName!: string | null;

  @ApiProperty({ example: 2500000 })
  baseSalaryMonthlySnapshot!: number;

  @ApiProperty({ example: 150000 })
  bonusTotal!: number;

  @ApiProperty({ example: 1 })
  bonusCount!: number;

  @ApiProperty({ example: 2650000 })
  totalPay!: number;
}

export class EmployeeMonthlyPayrollSummaryResponseDto {
  @ApiProperty({ example: 'payroll-2026-05' })
  id!: string;

  @ApiProperty({ example: 2026 })
  year!: number;

  @ApiProperty({ example: 5 })
  month!: number;

  @ApiProperty({ enum: ['DRAFT', 'FINALIZED'], example: 'DRAFT' })
  status!: 'DRAFT' | 'FINALIZED';

  @ApiProperty({ example: 5700000 })
  salaryTotal!: number;

  @ApiProperty({ example: 240000 })
  bonusTotal!: number;

  @ApiProperty({ example: 5940000 })
  grandTotal!: number;

  @ApiProperty({ example: '2026-05-31T12:00:00.000Z', format: 'date-time' })
  generatedAt!: Date;

  @ApiProperty({
    example: '2026-05-31T23:59:59.000Z',
    format: 'date-time',
    nullable: true,
  })
  finalizedAt!: Date | null;

  @ApiProperty({ example: '2026-05-31T12:00:00.000Z', format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-31T12:00:00.000Z', format: 'date-time' })
  updatedAt!: Date;
}

export class EmployeeMonthlyPayrollDetailResponseDto extends EmployeeMonthlyPayrollSummaryResponseDto {
  @ApiProperty({ type: [EmployeeMonthlyPayrollLineResponseDto] })
  lines!: EmployeeMonthlyPayrollLineResponseDto[];
}

export class EmployeeMonthlyPayrollListMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class EmployeeMonthlyPayrollListResponseDto {
  @ApiProperty({ type: [EmployeeMonthlyPayrollSummaryResponseDto] })
  data!: EmployeeMonthlyPayrollSummaryResponseDto[];

  @ApiProperty({ type: EmployeeMonthlyPayrollListMetaDto })
  meta!: EmployeeMonthlyPayrollListMetaDto;
}
