import { ApiProperty } from '@nestjs/swagger';
import { CashOperationalReportDto } from './report-response-common.dto';

class SummaryWorkOrderCountsDto {
  @ApiProperty() inProgress!: number;
  @ApiProperty() paused!: number;
  @ApiProperty() completed!: number;
  @ApiProperty() cancelled!: number;
}

class SummaryPaymentStatusCountsDto {
  @ApiProperty() pending!: number;
  @ApiProperty() partial!: number;
  @ApiProperty() paid!: number;
}

class SummaryReportTotalsDto {
  @ApiProperty({ type: SummaryWorkOrderCountsDto })
  workOrders!: SummaryWorkOrderCountsDto;

  @ApiProperty({ type: SummaryPaymentStatusCountsDto })
  paymentStatus!: SummaryPaymentStatusCountsDto;

  @ApiProperty() paymentsCollected!: number;
  @ApiProperty({ nullable: true }) pendingReceivables!: number | null;
  @ApiProperty() actualCosts!: number;
  @ApiProperty() paidExpenses!: number;
  @ApiProperty() pendingExpenses!: number;
  @ApiProperty({ nullable: true }) approximateUtility!: number | null;
}

export class SummaryReportResponseDto extends CashOperationalReportDto {
  @ApiProperty({ type: SummaryReportTotalsDto })
  totals!: SummaryReportTotalsDto;
}
