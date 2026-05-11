import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import {
  ExpenseCategory,
  PaymentStatus,
} from '../../../generated/prisma/enums';
import { OptionalTrimmedString } from './report-query.transforms';
import { ReportDateRangeQueryDto } from './report-date-range-query.dto';

const expenseCategories = Object.values(ExpenseCategory);
const expensePaymentStatuses = [
  PaymentStatus.PENDING,
  PaymentStatus.PAID,
] as const;

export class ExpensesBreakdownReportQueryDto extends ReportDateRangeQueryDto {
  @ApiPropertyOptional({ example: 'cost-center-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  costCenterId?: string;

  @ApiPropertyOptional({
    enum: expenseCategories,
    example: ExpenseCategory.RENT,
  })
  @IsOptional()
  @IsIn(expenseCategories)
  expenseCategory?: ExpenseCategory;

  @ApiPropertyOptional({
    enum: expensePaymentStatuses,
    example: PaymentStatus.PENDING,
  })
  @IsOptional()
  @IsIn(expensePaymentStatuses)
  paymentStatus?: (typeof expensePaymentStatuses)[number];
}
