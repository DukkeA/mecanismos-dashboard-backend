import { BadRequestException, Injectable } from '@nestjs/common';
import { EstimatePhase } from '../../../generated/prisma/enums';
import { UpsertWorkOrderEstimateDto } from '../dto/upsert-work-order-estimate.dto';
import { WorkOrdersRepository } from '../persistence/work-orders.repository';
import { WorkOrderReadModelService } from './work-order-read-model.service';
import { WorkOrderRelationsService } from './work-order-relations.service';

const estimatePhases = Object.values(EstimatePhase);

@Injectable()
export class WorkOrderEstimatesService {
  constructor(
    private readonly workOrdersRepository: WorkOrdersRepository,
    private readonly workOrderRelationsService: WorkOrderRelationsService,
    private readonly workOrderReadModelService: WorkOrderReadModelService,
  ) {}

  async upsertEstimate(
    id: string,
    phase: string,
    dto: UpsertWorkOrderEstimateDto,
  ) {
    const resolvedPhase = parseEstimatePhase(phase);

    await this.workOrderReadModelService.findOne(id);
    await this.workOrderRelationsService.assertEstimateLineRelations(
      id,
      dto.lines,
    );

    return this.workOrdersRepository.upsertEstimate(id, resolvedPhase, dto);
  }

  async findEstimates(id: string) {
    await this.workOrderReadModelService.findOne(id);

    return {
      data: await this.workOrdersRepository.findEstimatesByWorkOrderId(id),
    };
  }
}

function parseEstimatePhase(phase: string) {
  const normalizedPhase = phase.trim().toUpperCase();

  if (estimatePhases.includes(normalizedPhase as EstimatePhase)) {
    return normalizedPhase as EstimatePhase;
  }

  throw new BadRequestException(`Estimate phase ${phase} is invalid`);
}
