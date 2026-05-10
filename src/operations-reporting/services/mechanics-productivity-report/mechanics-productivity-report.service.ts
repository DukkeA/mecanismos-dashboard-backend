import { Injectable, NotImplementedException } from '@nestjs/common';

import { MechanicsProductivityReportQueryDto } from '../../dto/mechanics-productivity-report-query.dto';
import { MechanicsProductivityReportResponseDto } from '../../dto/mechanics-productivity-report-response.dto';

@Injectable()
export class MechanicsProductivityReportService {
  async getReport(
    _query: MechanicsProductivityReportQueryDto,
  ): Promise<MechanicsProductivityReportResponseDto> {
    throw new NotImplementedException(
      'Mechanics productivity report is not implemented yet',
    );
  }
}
