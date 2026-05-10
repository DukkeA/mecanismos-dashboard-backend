import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { EmployeeType } from '../../../generated/prisma/enums';
import {
  OptionalBooleanQuery,
  OptionalTrimmedString,
} from './report-query.transforms';
import { ReportDateRangeQueryDto } from './report-date-range-query.dto';

const employeeTypes = Object.values(EmployeeType);

export class MechanicsProductivityReportQueryDto extends ReportDateRangeQueryDto {
  @ApiPropertyOptional({ example: 'employee-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  assignedEmployeeId?: string;

  @ApiPropertyOptional({ enum: employeeTypes, example: EmployeeType.MECHANIC })
  @IsOptional()
  @IsIn(employeeTypes)
  employeeType?: EmployeeType;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @OptionalBooleanQuery()
  @IsBoolean()
  includeInactiveMechanics?: boolean;
}
