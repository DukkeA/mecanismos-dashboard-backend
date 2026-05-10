import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginationMeta } from '../../common/pagination/pagination-meta';
import { ListWorkOrdersQueryDto } from '../dto/list-work-orders-query.dto';
import { WorkOrdersRepository } from '../persistence/work-orders.repository';

@Injectable()
export class WorkOrderReadModelService {
  constructor(private readonly workOrdersRepository: WorkOrdersRepository) {}

  async findMany(query: ListWorkOrdersQueryDto) {
    const result = await this.workOrdersRepository.findMany(query);

    return {
      data: result.items,
      meta: buildPaginationMeta(result),
    };
  }

  async findOne(id: string) {
    const workOrder = await this.workOrdersRepository.findById(id);

    if (!workOrder) {
      throw new NotFoundException(`Work order ${id} not found`);
    }

    return workOrder;
  }
}
