import { BadRequestException, Injectable } from '@nestjs/common';
import { EstimatePhase } from '../../../generated/prisma/enums';
import { AppSettingsService } from '../../app-settings/app-settings.service';
import { resolveDefaultContingencyPct } from '../../app-settings/app-settings.contract';
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
    private readonly appSettingsService: AppSettingsService,
  ) {}

  async upsertEstimate(
    id: string,
    phase: string,
    dto: UpsertWorkOrderEstimateDto,
  ) {
    const resolvedPhase = parseEstimatePhase(phase);

    const workOrder = await this.workOrderReadModelService.findOne(id);
    await this.workOrderRelationsService.assertEstimateLineRelations(
      id,
      dto.lines,
    );

    const settings =
      await this.appSettingsService.getCurrentPricingLaborSettings();
    const preparedEstimate = prepareEstimateInput(dto, workOrder, settings);

    return this.workOrdersRepository.upsertEstimate(
      id,
      resolvedPhase,
      preparedEstimate,
    );
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

function prepareEstimateInput(
  dto: UpsertWorkOrderEstimateDto,
  workOrder: {
    type: string;
    workshopDetails?: { diagnosisRequired: boolean } | null;
  },
  settings: {
    defaultLaborHourlyRate: number;
    saleContingencyPct: number;
    workshopContingencyPct: number;
    diagnosticContingencyPct: number;
    minimumMarkupPct: number;
    recommendedMarkupPct: number;
    highMarkupPct: number;
  },
): UpsertWorkOrderEstimateDto {
  const laborHourlyCostSnapshot =
    dto.laborHourlyCostSnapshot ?? settings.defaultLaborHourlyRate;
  const estimatedLaborHours = dto.estimatedLaborHours ?? 0;
  const baseCostAmount =
    dto.baseCostAmount ??
    calculateLineBaseCost(dto.lines) +
      Math.round(estimatedLaborHours * laborHourlyCostSnapshot);
  const contingencyPct =
    dto.contingencyPct ??
    resolveDefaultContingencyPct(
      workOrder.type,
      workOrder.workshopDetails?.diagnosisRequired ?? false,
      settings,
    );
  const totalCostAmount =
    dto.totalCostAmount ??
    baseCostAmount + Math.round((baseCostAmount * contingencyPct) / 100);
  const recommendedMinimumPrice =
    dto.recommendedMinimumPrice ??
    applyMarkup(totalCostAmount, settings.minimumMarkupPct);
  const recommendedPrice =
    dto.recommendedPrice ??
    applyMarkup(totalCostAmount, settings.recommendedMarkupPct);
  const recommendedHighPrice =
    dto.recommendedHighPrice ??
    applyMarkup(totalCostAmount, settings.highMarkupPct);

  return {
    ...dto,
    laborHourlyCostSnapshot,
    baseCostAmount,
    contingencyPct,
    totalCostAmount,
    recommendedMinimumPrice,
    recommendedPrice,
    recommendedHighPrice,
    totalPriceAmount: dto.totalPriceAmount ?? recommendedPrice,
  };
}

function calculateLineBaseCost(lines: UpsertWorkOrderEstimateDto['lines']) {
  return (lines ?? []).reduce((sum, line) => {
    const quantity = line.quantity ?? 1;
    const unitCost = line.unitCost ?? 0;

    return sum + quantity * unitCost;
  }, 0);
}

function applyMarkup(amount: number, markupPct: number) {
  return Math.round(amount * (1 + markupPct / 100));
}
