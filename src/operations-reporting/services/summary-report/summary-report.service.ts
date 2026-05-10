import { Injectable, NotImplementedException } from '@nestjs/common';

import { SummaryReportQueryDto } from '../../dto/summary-report-query.dto';
import { SummaryReportResponseDto } from '../../dto/summary-report-response.dto';

@Injectable()
export class SummaryReportService {
  async getReport(
    _query: SummaryReportQueryDto,
  ): Promise<SummaryReportResponseDto> {
    throw new NotImplementedException('Summary report is not implemented yet');
  }
}
