import { BadRequestException } from '@nestjs/common';
import {
  EstimateLineType,
  EstimatePhase,
} from '../../../generated/prisma/enums';
import { UpsertWorkOrderEstimateDto } from '../dto/upsert-work-order-estimate.dto';
import { AppSettingsService } from '../../app-settings/app-settings.service';
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

  const getCurrentPricingLaborSettingsMock = jest.fn();
  const appSettingsService = {
    getCurrentPricingLaborSettings: getCurrentPricingLaborSettingsMock,
  } as unknown as jest.Mocked<AppSettingsService>;

  let service: WorkOrderEstimatesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkOrderEstimatesService(
      repository,
      relationsService,
      readModelService,
      appSettingsService,
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

    readModelFindOneMock.mockResolvedValue({
      id: 'wo-1',
      type: 'SALE',
      workshopDetails: null,
    });
    assertEstimateLineRelationsMock.mockResolvedValue(undefined);
    getCurrentPricingLaborSettingsMock.mockResolvedValue({
      currencyCode: 'COP',
      monthlyWorkingHours: 176,
      defaultLaborHourlyRate: 50000,
      saleContingencyPct: 5,
      workshopContingencyPct: 10,
      diagnosticContingencyPct: 20,
      minimumMarkupPct: 20,
      recommendedMarkupPct: 35,
      highMarkupPct: 50,
    });
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
      expect.objectContaining({
        ...dto,
        laborHourlyCostSnapshot: 50000,
        contingencyPct: 5,
        recommendedPrice: 202500,
      }),
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
    expect(getCurrentPricingLaborSettingsMock).not.toHaveBeenCalled();
  });

  it('applies pricing/labor defaults from current settings when the request omits snapshot fields', async () => {
    const dto: UpsertWorkOrderEstimateDto = {
      estimatedLaborHours: 2,
      lines: [
        {
          lineType: EstimateLineType.PART,
          description: 'Inyector Bosch',
          quantity: 1,
          unitCost: 100000,
        },
        {
          lineType: EstimateLineType.SERVICE,
          description: 'Diagnóstico',
          quantity: 2,
          unitCost: 25000,
        },
      ],
    };

    readModelFindOneMock.mockResolvedValue({
      id: 'wo-1',
      type: 'SALE',
      workshopDetails: null,
    });
    assertEstimateLineRelationsMock.mockResolvedValue(undefined);
    getCurrentPricingLaborSettingsMock.mockResolvedValue({
      currencyCode: 'COP',
      monthlyWorkingHours: 176,
      defaultLaborHourlyRate: 50000,
      saleContingencyPct: 5,
      workshopContingencyPct: 10,
      diagnosticContingencyPct: 20,
      minimumMarkupPct: 20,
      recommendedMarkupPct: 35,
      highMarkupPct: 50,
    });
    upsertEstimateMock.mockResolvedValue({ id: 'estimate-2' });

    await service.upsertEstimate('wo-1', 'initial', dto);

    expect(upsertEstimateMock).toHaveBeenCalledWith(
      'wo-1',
      EstimatePhase.INITIAL,
      expect.objectContaining({
        laborHourlyCostSnapshot: 50000,
        baseCostAmount: 250000,
        contingencyPct: 5,
        totalCostAmount: 262500,
        recommendedMinimumPrice: 315000,
        recommendedPrice: 354375,
        recommendedHighPrice: 393750,
        totalPriceAmount: 354375,
      }),
    );
  });

  it('preserves explicit estimate snapshot overrides instead of replacing them with settings defaults', async () => {
    const dto: UpsertWorkOrderEstimateDto = {
      estimatedLaborHours: 1,
      laborHourlyCostSnapshot: 70000,
      baseCostAmount: 90000,
      contingencyPct: 3,
      totalCostAmount: 93000,
      recommendedMinimumPrice: 110000,
      recommendedPrice: 120000,
      recommendedHighPrice: 135000,
      totalPriceAmount: 120000,
      lines: [],
    };

    readModelFindOneMock.mockResolvedValue({
      id: 'wo-1',
      type: 'WORKSHOP',
      workshopDetails: { diagnosisRequired: true },
    });
    assertEstimateLineRelationsMock.mockResolvedValue(undefined);
    getCurrentPricingLaborSettingsMock.mockResolvedValue({
      currencyCode: 'COP',
      monthlyWorkingHours: 176,
      defaultLaborHourlyRate: 50000,
      saleContingencyPct: 5,
      workshopContingencyPct: 10,
      diagnosticContingencyPct: 20,
      minimumMarkupPct: 20,
      recommendedMarkupPct: 35,
      highMarkupPct: 50,
    });
    upsertEstimateMock.mockResolvedValue({ id: 'estimate-3' });

    await service.upsertEstimate('wo-1', 'final', dto);

    expect(upsertEstimateMock).toHaveBeenCalledWith(
      'wo-1',
      EstimatePhase.FINAL,
      expect.objectContaining({
        laborHourlyCostSnapshot: 70000,
        baseCostAmount: 90000,
        contingencyPct: 3,
        totalCostAmount: 93000,
        recommendedMinimumPrice: 110000,
        recommendedPrice: 120000,
        recommendedHighPrice: 135000,
        totalPriceAmount: 120000,
      }),
    );
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
