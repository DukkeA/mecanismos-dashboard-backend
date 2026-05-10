import { Injectable, NotImplementedException } from '@nestjs/common';

import { WorkOrderProfitabilityReportQueryDto } from '../../dto/work-order-profitability-report-query.dto';
import { WorkOrderProfitabilityReportResponseDto } from '../../dto/work-order-profitability-report-response.dto';

@Injectable()
export class WorkOrderProfitabilityReportService {
  async getReport(
    _query: WorkOrderProfitabilityReportQueryDto,
  ): Promise<WorkOrderProfitabilityReportResponseDto> {
    throw new NotImplementedException(
      'Work-order profitability report is not implemented yet',
    );
  }
}
