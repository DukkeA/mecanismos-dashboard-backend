import { Injectable, NotImplementedException } from '@nestjs/common';
import { UpsertWorkOrderEstimateDto } from '../dto/upsert-work-order-estimate.dto';
import { WorkOrdersRepository } from '../persistence/work-orders.repository';

@Injectable()
export class WorkOrderEstimatesService {
  constructor(private readonly workOrdersRepository: WorkOrdersRepository) {
    void this.workOrdersRepository;
  }

  upsertEstimate(_id: string, _phase: string, _dto: UpsertWorkOrderEstimateDto) {
    throw new NotImplementedException('Lane 4 implements estimate upserts');
  }

  findEstimates(_id: string) {
    throw new NotImplementedException('Lane 4 implements estimate reads');
  }
}
