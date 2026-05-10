import { Injectable } from '@nestjs/common';
import { WorkOrdersRepository } from '../persistence/work-orders.repository';

@Injectable()
export class WorkOrderReadModelService {
  constructor(private readonly workOrdersRepository: WorkOrdersRepository) {
    void this.workOrdersRepository;
  }
}
