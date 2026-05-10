import { Injectable } from '@nestjs/common';
import { CreateWorkOrderDto } from '../dto/create-work-order.dto';
import { ListWorkOrdersQueryDto } from '../dto/list-work-orders-query.dto';
import { UpdateWorkOrderDto } from '../dto/update-work-order.dto';
import { WorkOrdersRepository } from '../persistence/work-orders.repository';
import { WorkOrderReadModelService } from './work-order-read-model.service';
import { WorkOrderRelationsService } from './work-order-relations.service';

@Injectable()
export class WorkOrderLifecycleService {
  constructor(
    private readonly workOrdersRepository: WorkOrdersRepository,
    private readonly workOrderRelationsService: WorkOrderRelationsService,
    private readonly workOrderReadModelService: WorkOrderReadModelService,
  ) {}

  async create(createWorkOrderDto: CreateWorkOrderDto) {
    await this.workOrderRelationsService.assertCreateRelations(createWorkOrderDto);

    return this.workOrdersRepository.create(createWorkOrderDto);
  }

  findAll(query: ListWorkOrdersQueryDto) {
    return this.workOrderReadModelService.findMany(query);
  }

  findOne(id: string) {
    return this.workOrderReadModelService.findOne(id);
  }

  async update(id: string, updateWorkOrderDto: UpdateWorkOrderDto) {
    const currentWorkOrder = await this.workOrderReadModelService.findOne(id);

    await this.workOrderRelationsService.assertUpdateRelations(
      currentWorkOrder,
      updateWorkOrderDto,
    );

    return this.workOrdersRepository.update(id, updateWorkOrderDto);
  }
}
