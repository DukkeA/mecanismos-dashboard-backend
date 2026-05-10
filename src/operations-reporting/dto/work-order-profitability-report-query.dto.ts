import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { WorkOrderStatus } from '../../../generated/prisma/enums';
import {
  OptionalTrimmedString,
} from './report-query.transforms';
import { ReportDateRangeQueryDto } from './report-date-range-query.dto';

const workOrderStatuses = Object.values(WorkOrderStatus);

export class WorkOrderProfitabilityReportQueryDto extends ReportDateRangeQueryDto {
  @ApiPropertyOptional({ example: 'customer-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: 'employee-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  assignedEmployeeId?: string;

  @ApiPropertyOptional({ enum: workOrderStatuses, example: WorkOrderStatus.COMPLETED })
  @IsOptional()
  @IsIn(workOrderStatuses)
  status?: WorkOrderStatus;
}
