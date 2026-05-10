import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus, WorkOrderStatus } from '../../../generated/prisma/enums';
import { CashOperationalReportDto } from './report-response-common.dto';

class PendingPaymentsReportRowDto {
  @ApiProperty() workOrderId!: string;
  @ApiProperty({ nullable: true }) customerId!: string | null;
  @ApiProperty({ nullable: true }) customerName!: string | null;
  @ApiProperty({ nullable: true }) assetLabel!: string | null;
  @ApiProperty({ enum: Object.values(WorkOrderStatus) }) status!: WorkOrderStatus;
  @ApiProperty({ enum: Object.values(PaymentStatus) }) paymentStatus!: PaymentStatus;
  @ApiProperty({ nullable: true }) payableAmount!: number | null;
  @ApiProperty() paidTotal!: number;
  @ApiProperty({ nullable: true }) balance!: number | null;
  @ApiProperty() overpaid!: boolean;
}

export class PendingPaymentsReportResponseDto extends CashOperationalReportDto {
  @ApiProperty({ type: PendingPaymentsReportRowDto, isArray: true })
  data!: PendingPaymentsReportRowDto[];
}
