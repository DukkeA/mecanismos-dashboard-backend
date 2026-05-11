import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import {
  PaymentStatus,
  WorkOrderStatus,
} from '../../../generated/prisma/enums';
import { OptionalTrimmedString } from './report-query.transforms';
import { ReportDateRangeQueryDto } from './report-date-range-query.dto';

const paymentStatuses = Object.values(PaymentStatus);
const workOrderStatuses = Object.values(WorkOrderStatus);

export class PendingPaymentsReportQueryDto extends ReportDateRangeQueryDto {
  @ApiPropertyOptional({ example: 'customer-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    enum: paymentStatuses,
    example: PaymentStatus.PARTIAL,
  })
  @IsOptional()
  @IsIn(paymentStatuses)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({
    enum: workOrderStatuses,
    example: WorkOrderStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsIn(workOrderStatuses)
  status?: WorkOrderStatus;
}
