import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  PaymentStatus,
  WorkOrderStatus,
  WorkOrderType,
} from '../../../generated/prisma/enums';
import { OptionalTrimmedString } from '../../common/transforms/string.transforms';

const workOrderTypes = Object.values(WorkOrderType);
const workOrderStatuses = Object.values(WorkOrderStatus);
const paymentStatuses = Object.values(PaymentStatus);

export class ListWorkOrdersQueryDto {
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

  @ApiPropertyOptional({ example: 'OT-1024' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: workOrderTypes, example: 'WORKSHOP' })
  @IsOptional()
  @IsIn(workOrderTypes)
  type?: WorkOrderType;

  @ApiPropertyOptional({ enum: workOrderStatuses, example: 'IN_PROGRESS' })
  @IsOptional()
  @IsIn(workOrderStatuses)
  status?: WorkOrderStatus;

  @ApiPropertyOptional({ enum: paymentStatuses, example: 'PARTIAL' })
  @IsOptional()
  @IsIn(paymentStatuses)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ example: 'customer-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: 'vehicle-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ example: 'component-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  componentId?: string;

  @ApiPropertyOptional({ example: 'employee-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  assignedEmployeeId?: string;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  estimatedCompletionFrom?: Date;

  @ApiPropertyOptional({ example: '2026-05-31T23:59:59.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  estimatedCompletionTo?: Date;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  estimatedCollectionFrom?: Date;

  @ApiPropertyOptional({ example: '2026-05-31T23:59:59.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  estimatedCollectionTo?: Date;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  completedFrom?: Date;

  @ApiPropertyOptional({ example: '2026-05-31T23:59:59.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  completedTo?: Date;
}
