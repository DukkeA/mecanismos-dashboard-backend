import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateWorkOrderActualCostDto } from '../dto/create-work-order-actual-cost.dto';
import { UpdateWorkOrderActualCostDto } from '../dto/update-work-order-actual-cost.dto';
import { WorkOrdersRepository } from '../persistence/work-orders.repository';
import { WorkOrderReadModelService } from './work-order-read-model.service';
import { WorkOrderRelationsService } from './work-order-relations.service';

@Injectable()
export class WorkOrderActualCostsService {
  constructor(
    private readonly workOrdersRepository: WorkOrdersRepository,
    private readonly workOrderReadModelService: WorkOrderReadModelService,
    private readonly workOrderRelationsService: WorkOrderRelationsService,
  ) {}

  async createActualCost(id: string, dto: CreateWorkOrderActualCostDto) {
    await this.workOrderReadModelService.findOne(id);
    await this.workOrderRelationsService.assertActualCostCreateRelations(dto);

    return this.workOrdersRepository.createActualCost(id, dto);
  }

  async findActualCosts(id: string) {
    await this.workOrderReadModelService.findOne(id);

    return {
      data: await this.workOrdersRepository.findActualCosts(id),
    };
  }

  async updateActualCost(
    id: string,
    costId: string,
    dto: UpdateWorkOrderActualCostDto,
  ) {
    await this.workOrderReadModelService.findOne(id);

    const currentActualCost = await this.workOrdersRepository.findActualCostById(
      id,
      costId,
    );

    if (!currentActualCost) {
      throw new NotFoundException(
        `Actual cost ${costId} not found for work order ${id}`,
      );
    }

    await this.workOrderRelationsService.assertActualCostUpdateRelations(
      currentActualCost,
      dto,
    );

    return this.workOrdersRepository.updateActualCost(id, costId, dto);
  }

  async removeActualCost(id: string, costId: string) {
    await this.workOrderReadModelService.findOne(id);

    const currentActualCost = await this.workOrdersRepository.findActualCostById(
      id,
      costId,
    );

    if (!currentActualCost) {
      throw new NotFoundException(
        `Actual cost ${costId} not found for work order ${id}`,
      );
    }

    return this.workOrdersRepository.removeActualCost(id, costId);
  }
}
