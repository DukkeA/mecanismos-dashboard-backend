import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateWorkOrderDto } from '../dto/create-work-order.dto';
import { ListWorkOrdersQueryDto } from '../dto/list-work-orders-query.dto';
import { UpdateWorkOrderDto } from '../dto/update-work-order.dto';
import { WorkOrdersRepository } from '../persistence/work-orders.repository';

@Injectable()
export class WorkOrderLifecycleService {
  constructor(private readonly workOrdersRepository: WorkOrdersRepository) {
    void this.workOrdersRepository;
  }

  create(_createWorkOrderDto: CreateWorkOrderDto) {
    throw new NotImplementedException('Lane 2 implements work-order creation');
  }

  findAll(_query: ListWorkOrdersQueryDto) {
    throw new NotImplementedException('Lane 2 implements work-order listing');
  }

  findOne(_id: string) {
    throw new NotImplementedException('Lane 2 implements work-order detail reads');
  }

  update(_id: string, _updateWorkOrderDto: UpdateWorkOrderDto) {
    throw new NotImplementedException('Lane 2 implements work-order updates');
  }
}
