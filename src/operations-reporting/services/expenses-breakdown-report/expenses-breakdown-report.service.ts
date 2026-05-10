import { Injectable, NotImplementedException } from '@nestjs/common';

import { ExpensesBreakdownReportQueryDto } from '../../dto/expenses-breakdown-report-query.dto';
import { ExpensesBreakdownReportResponseDto } from '../../dto/expenses-breakdown-report-response.dto';

@Injectable()
export class ExpensesBreakdownReportService {
  async getReport(
    _query: ExpensesBreakdownReportQueryDto,
  ): Promise<ExpensesBreakdownReportResponseDto> {
    throw new NotImplementedException(
      'Expenses breakdown report is not implemented yet',
    );
  }
}
