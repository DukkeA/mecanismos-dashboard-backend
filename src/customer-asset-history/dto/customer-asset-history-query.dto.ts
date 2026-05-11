import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  PaymentStatus,
  WorkOrderStatus,
  WorkOrderType,
} from '../../../generated/prisma/enums';
import { ReportDateRangeQueryDto } from '../../operations-reporting/dto/report-date-range-query.dto';

const workOrderTypes = Object.values(WorkOrderType);
const workOrderStatuses = Object.values(WorkOrderStatus);
const paymentStatuses = Object.values(PaymentStatus);

export const CustomerAssetHistoryDateField = {
  CREATED_AT: 'createdAt',
  COMPLETED_AT: 'completedAt',
  ESTIMATED_COLLECTION_AT: 'estimatedCollectionAt',
} as const;

const customerAssetHistoryDateFields = Object.values(
  CustomerAssetHistoryDateField,
);

export class CustomerAssetHistoryQueryDto extends ReportDateRangeQueryDto {
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

  @ApiPropertyOptional({
    enum: customerAssetHistoryDateFields,
    default: CustomerAssetHistoryDateField.CREATED_AT,
  })
  @IsOptional()
  @IsIn(customerAssetHistoryDateFields)
  dateField: (typeof customerAssetHistoryDateFields)[number] =
    CustomerAssetHistoryDateField.CREATED_AT;

  @ApiPropertyOptional({ enum: workOrderStatuses })
  @IsOptional()
  @IsIn(workOrderStatuses)
  status?: WorkOrderStatus;

  @ApiPropertyOptional({ enum: paymentStatuses })
  @IsOptional()
  @IsIn(paymentStatuses)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ enum: workOrderTypes })
  @IsOptional()
  @IsIn(workOrderTypes)
  type?: WorkOrderType;
}
