import { Injectable, Logger } from '@nestjs/common';
import { CreateWorkOrderDto } from '../dto/create-work-order.dto';
import { ListWorkOrdersQueryDto } from '../dto/list-work-orders-query.dto';
import { UpdateWorkOrderDto } from '../dto/update-work-order.dto';
import { WorkOrdersRepository } from '../persistence/work-orders.repository';
import { WorkOrderReadModelService } from './work-order-read-model.service';
import { WorkOrderRelationsService } from './work-order-relations.service';

@Injectable()
export class WorkOrderLifecycleService {
  private readonly logger = new Logger(WorkOrderLifecycleService.name);

  constructor(
    private readonly workOrdersRepository: WorkOrdersRepository,
    private readonly workOrderRelationsService: WorkOrderRelationsService,
    private readonly workOrderReadModelService: WorkOrderReadModelService,
  ) {}

  async create(createWorkOrderDto: CreateWorkOrderDto) {
    await this.workOrderRelationsService.assertCreateRelations(
      createWorkOrderDto,
    );

    const createdWorkOrder =
      await this.workOrdersRepository.create(createWorkOrderDto);

    this.logger.log(
      `Created work order workOrderId=${createdWorkOrder.id} type=${createdWorkOrder.type} status=${createdWorkOrder.status} paymentStatus=${createdWorkOrder.paymentStatus}`,
    );

    return createdWorkOrder;
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

    const updatedWorkOrder = await this.workOrdersRepository.update(
      id,
      updateWorkOrderDto,
      currentWorkOrder.type,
    );

    this.logger.log(
      `Updated work order workOrderId=${updatedWorkOrder.id} type=${updatedWorkOrder.type} status=${updatedWorkOrder.status} paymentStatus=${updatedWorkOrder.paymentStatus}`,
    );

    return updatedWorkOrder;
  }
}
