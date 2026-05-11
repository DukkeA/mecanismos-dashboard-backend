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
  const upsertEstimateMock = jest.fn();
  const findEstimatesByWorkOrderIdMock = jest.fn();
  const repository = {
    upsertEstimate: upsertEstimateMock,
    findEstimatesByWorkOrderId: findEstimatesByWorkOrderIdMock,
  } as unknown as jest.Mocked<WorkOrdersRepository>;

  const assertEstimateLineRelationsMock = jest.fn();
  const relationsService = {
    assertEstimateLineRelations: assertEstimateLineRelationsMock,
  } as unknown as jest.Mocked<WorkOrderRelationsService>;

  const readModelFindOneMock = jest.fn();
  const readModelService = {
    findOne: readModelFindOneMock,
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

    readModelFindOneMock.mockResolvedValue({ id: 'wo-1' });
    assertEstimateLineRelationsMock.mockResolvedValue(undefined);
    upsertEstimateMock.mockResolvedValue({
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

    expect(readModelFindOneMock).toHaveBeenCalledWith('wo-1');
    expect(assertEstimateLineRelationsMock).toHaveBeenCalledWith(
      'wo-1',
      dto.lines,
    );
    expect(upsertEstimateMock).toHaveBeenCalledWith(
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

    expect(readModelFindOneMock).not.toHaveBeenCalled();
    expect(assertEstimateLineRelationsMock).not.toHaveBeenCalled();
    expect(upsertEstimateMock).not.toHaveBeenCalled();
  });

  it('lists INITIAL and FINAL estimates once the work order exists', async () => {
    readModelFindOneMock.mockResolvedValue({ id: 'wo-1' });
    findEstimatesByWorkOrderIdMock.mockResolvedValue([
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

    expect(readModelFindOneMock).toHaveBeenCalledWith('wo-1');
    expect(findEstimatesByWorkOrderIdMock).toHaveBeenCalledWith('wo-1');
  });
});
