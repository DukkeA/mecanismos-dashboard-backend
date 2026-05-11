import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import {
  PaymentStatus,
  WorkOrderStatus,
} from '../../../generated/prisma/enums';
import { ReportDateRangeQueryDto } from './report-date-range-query.dto';

const workOrderStatuses = Object.values(WorkOrderStatus);
const paymentStatuses = Object.values(PaymentStatus);

export class SummaryReportQueryDto extends ReportDateRangeQueryDto {
  @ApiPropertyOptional({
    enum: workOrderStatuses,
    example: WorkOrderStatus.COMPLETED,
  })
  @IsOptional()
  @IsIn(workOrderStatuses)
  status?: WorkOrderStatus;

  @ApiPropertyOptional({ enum: paymentStatuses, example: PaymentStatus.PAID })
  @IsOptional()
  @IsIn(paymentStatuses)
  paymentStatus?: PaymentStatus;
}
