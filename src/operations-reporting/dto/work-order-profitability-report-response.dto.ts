import { ApiProperty } from '@nestjs/swagger';
import { CashOperationalReportDto } from './report-response-common.dto';

class WorkOrderProfitabilityReportRowDto {
  @ApiProperty() workOrderId!: string;
  @ApiProperty({ nullable: true }) customerName!: string | null;
  @ApiProperty({ nullable: true }) payableAmount!: number | null;
  @ApiProperty() paidTotal!: number;
  @ApiProperty() actualCostTotal!: number;
  @ApiProperty({ nullable: true }) grossUtility!: number | null;
  @ApiProperty({ nullable: true }) grossMargin!: number | null;
}

export class WorkOrderProfitabilityReportResponseDto extends CashOperationalReportDto {
  @ApiProperty({ type: WorkOrderProfitabilityReportRowDto, isArray: true })
  data!: WorkOrderProfitabilityReportRowDto[];
}
