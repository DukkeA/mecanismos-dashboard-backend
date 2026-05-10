import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsIn, IsOptional, IsString } from 'class-validator';
import {
  PaymentStatus,
  WorkOrderStatus,
  WorkOrderType,
} from '../../../generated/prisma/enums';
import {
  OptionalTrimmedString,
  TrimmedString,
} from '../../common/transforms/string.transforms';

const workOrderTypes = Object.values(WorkOrderType);
const workOrderStatuses = Object.values(WorkOrderStatus);
const paymentStatuses = Object.values(PaymentStatus);

function OptionalBooleanField() {
  return Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value !== 'string') {
      return value;
    }

    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }

    return value;
  });
}

export class CreateWorkOrderDto {
  @ApiProperty({ enum: workOrderTypes, example: 'SALE' })
  @IsIn(workOrderTypes)
  type!: WorkOrderType;

  @ApiProperty({ example: 'customer-1' })
  @TrimmedString()
  @IsString()
  customerId!: string;

  @ApiProperty({ example: 'Inspección y propuesta comercial' })
  @TrimmedString()
  @IsString()
  summary!: string;

  @ApiPropertyOptional({ enum: workOrderStatuses, example: 'IN_PROGRESS' })
  @IsOptional()
  @IsIn(workOrderStatuses)
  status?: WorkOrderStatus;

  @ApiPropertyOptional({ enum: paymentStatuses, example: 'PENDING' })
  @IsOptional()
  @IsIn(paymentStatuses)
  paymentStatus?: PaymentStatus;

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

  @ApiPropertyOptional({ example: 'https://example.com/ticket/123' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  externalLink?: string;

  @ApiPropertyOptional({ example: 'Nota operativa' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: '2026-05-30T18:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  estimatedCompletionAt?: Date;

  @ApiPropertyOptional({ example: '2026-05-31T18:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  estimatedCollectionAt?: Date;

  @ApiPropertyOptional({ example: '2026-05-31T20:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  completedAt?: Date;

  @ApiPropertyOptional({ example: 'No arranca al encender' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  customerReportedIssue?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @OptionalBooleanField()
  @IsBoolean()
  diagnosisRequired?: boolean;

  @ApiPropertyOptional({ example: 'Revisar sistema eléctrico primero' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  diagnosisSummary?: string;
}
