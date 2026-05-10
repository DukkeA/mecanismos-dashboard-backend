import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateWorkOrderActualCostDto } from '../dto/create-work-order-actual-cost.dto';
import { UpdateWorkOrderActualCostDto } from '../dto/update-work-order-actual-cost.dto';
import { WorkOrdersRepository } from '../persistence/work-orders.repository';

@Injectable()
export class WorkOrderActualCostsService {
  constructor(private readonly workOrdersRepository: WorkOrdersRepository) {
    void this.workOrdersRepository;
  }

  createActualCost(_id: string, _dto: CreateWorkOrderActualCostDto) {
    throw new NotImplementedException('Lane 5 implements actual-cost creation');
  }

  findActualCosts(_id: string) {
    throw new NotImplementedException('Lane 5 implements actual-cost reads');
  }

  updateActualCost(
    _id: string,
    _costId: string,
    _dto: UpdateWorkOrderActualCostDto,
  ) {
    throw new NotImplementedException('Lane 5 implements actual-cost updates');
  }

  removeActualCost(_id: string, _costId: string) {
    throw new NotImplementedException('Lane 5 implements actual-cost deletion');
  }
}
