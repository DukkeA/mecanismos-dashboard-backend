import { BadRequestException } from '@nestjs/common';
import {
  EstimateLineType,
  EstimatePhase,
} from '../../../generated/prisma/enums';
import { UpsertWorkOrderEstimateDto } from '../dto/upsert-work-order-estimate.dto';
import { WorkOrdersRepository } from '../persistence/work-orders.repository';
import { WorkOrderReadModelService } from './work-order-read-model.service';
import { WorkOrderRelationsService } from './work-order-relations.service';
import { WorkOrderEstimatesService } from './work-order-estimates.service';

describe('WorkOrderEstimatesService', () => {
  const repository = {
    upsertEstimate: jest.fn(),
    findEstimatesByWorkOrderId: jest.fn(),
  } as unknown as jest.Mocked<WorkOrdersRepository>;

  const relationsService = {
    assertEstimateLineRelations: jest.fn(),
  } as unknown as jest.Mocked<WorkOrderRelationsService>;

  const readModelService = {
    findOne: jest.fn(),
  } as unknown as jest.Mocked<WorkOrderReadModelService>;

  let service: WorkOrderEstimatesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkOrderEstimatesService(
      repository,
      relationsService,
      readModelService,
    );
  });

  it('upserts INITIAL estimates after validating the parent work order and linked lines', async () => {
    const dto: UpsertWorkOrderEstimateDto = {
      estimatedLaborHours: 1.5,
      baseCostAmount: 120000,
      totalCostAmount: 150000,
      totalPriceAmount: 220000,
      notes: 'Estimación inicial',
      lines: [
        {
          lineType: EstimateLineType.PART,
          description: 'Rodamiento delantero',
          inventoryItemId: 'inventory-1',
          supplierId: 'supplier-1',
          supplierQuoteHistoryId: 'quote-1',
          quantity: 2,
          unitCost: 60000,
          unitPrice: 95000,
        },
      ],
    };

    readModelService.findOne.mockResolvedValue({ id: 'wo-1' } as never);
    relationsService.assertEstimateLineRelations.mockResolvedValue(undefined);
    repository.upsertEstimate.mockResolvedValue({
      id: 'estimate-1',
      workOrderId: 'wo-1',
      phase: EstimatePhase.INITIAL,
      estimatedLaborHours: 1.5,
      baseCostAmount: 120000,
      contingencyPct: null,
      contingencyAmount: 30000,
      totalCostAmount: 150000,
      totalPriceAmount: 220000,
      notes: 'Estimación inicial',
      lines: [],
    });

    await expect(
      service.upsertEstimate('wo-1', ' initial ', dto),
    ).resolves.toMatchObject({
      id: 'estimate-1',
      phase: EstimatePhase.INITIAL,
    });

    expect(readModelService.findOne).toHaveBeenCalledWith('wo-1');
    expect(relationsService.assertEstimateLineRelations).toHaveBeenCalledWith(
      'wo-1',
      dto.lines,
    );
    expect(repository.upsertEstimate).toHaveBeenCalledWith(
      'wo-1',
      EstimatePhase.INITIAL,
      dto,
    );
  });

  it('rejects unknown estimate phases before touching relations or persistence', async () => {
    await expect(
      service.upsertEstimate('wo-1', 'draft', { lines: [] }),
    ).rejects.toThrow(
      new BadRequestException('Estimate phase draft is invalid'),
    );

    expect(readModelService.findOne).not.toHaveBeenCalled();
    expect(relationsService.assertEstimateLineRelations).not.toHaveBeenCalled();
    expect(repository.upsertEstimate).not.toHaveBeenCalled();
  });

  it('lists INITIAL and FINAL estimates once the work order exists', async () => {
    readModelService.findOne.mockResolvedValue({ id: 'wo-1' } as never);
    repository.findEstimatesByWorkOrderId.mockResolvedValue([
      {
        id: 'estimate-initial',
        workOrderId: 'wo-1',
        phase: EstimatePhase.INITIAL,
        estimatedLaborHours: 1.5,
        baseCostAmount: 120000,
        contingencyPct: null,
        contingencyAmount: 30000,
        totalCostAmount: 150000,
        totalPriceAmount: 220000,
        notes: 'Inicial',
        lines: [],
      },
      {
        id: 'estimate-final',
        workOrderId: 'wo-1',
        phase: EstimatePhase.FINAL,
        estimatedLaborHours: 2,
        baseCostAmount: 180000,
        contingencyPct: 10,
        contingencyAmount: 18000,
        totalCostAmount: 198000,
        totalPriceAmount: 280000,
        notes: 'Final',
        lines: [],
      },
    ] as never);

    await expect(service.findEstimates('wo-1')).resolves.toEqual({
      data: [
        expect.objectContaining({ phase: EstimatePhase.INITIAL }),
        expect.objectContaining({ phase: EstimatePhase.FINAL }),
      ],
    });

    expect(readModelService.findOne).toHaveBeenCalledWith('wo-1');
    expect(repository.findEstimatesByWorkOrderId).toHaveBeenCalledWith('wo-1');
  });
});
