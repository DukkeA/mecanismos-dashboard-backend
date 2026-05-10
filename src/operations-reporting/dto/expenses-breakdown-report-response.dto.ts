import { ApiProperty } from '@nestjs/swagger';
import { ExpenseCategory, PaymentStatus } from '../../../generated/prisma/enums';
import { CashOperationalReportDto } from './report-response-common.dto';

class ExpensesBreakdownReportRowDto {
  @ApiProperty() period!: string;
  @ApiProperty({ enum: Object.values(ExpenseCategory) })
  expenseCategory!: ExpenseCategory;
  @ApiProperty({ enum: Object.values(PaymentStatus) })
  paymentStatus!: PaymentStatus;
  @ApiProperty({ nullable: true }) costCenterId!: string | null;
  @ApiProperty({ nullable: true }) costCenterName!: string | null;
  @ApiProperty() totalAmount!: number;
}

export class ExpensesBreakdownReportResponseDto extends CashOperationalReportDto {
  @ApiProperty({ type: ExpensesBreakdownReportRowDto, isArray: true })
  data!: ExpensesBreakdownReportRowDto[];
}
