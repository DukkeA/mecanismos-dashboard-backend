import { Injectable, NotImplementedException } from '@nestjs/common';

import { PendingPaymentsReportQueryDto } from '../../dto/pending-payments-report-query.dto';
import { PendingPaymentsReportResponseDto } from '../../dto/pending-payments-report-response.dto';

@Injectable()
export class PendingPaymentsReportService {
  async getReport(
    _query: PendingPaymentsReportQueryDto,
  ): Promise<PendingPaymentsReportResponseDto> {
    throw new NotImplementedException(
      'Pending payments report is not implemented yet',
    );
  }
}
