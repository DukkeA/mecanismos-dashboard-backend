import { Injectable } from '@nestjs/common';
import { WorkOrdersRepository } from '../persistence/work-orders.repository';

@Injectable()
export class WorkOrderRelationsService {
  constructor(private readonly workOrdersRepository: WorkOrdersRepository) {
    void this.workOrdersRepository;
  }
}
