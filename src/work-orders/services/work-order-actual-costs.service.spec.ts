import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
  WorkOrderCostCategory,
  WorkOrderStatus,
  WorkOrderType,
} from '../../../generated/prisma/enums';
import { CreateWorkOrderActualCostDto } from '../dto/create-work-order-actual-cost.dto';
import {
  WorkOrderActualCostSummary,
  WorkOrdersRepository,
} from '../persistence/work-orders.repository';
import { WorkOrderReadModelService } from './work-order-read-model.service';
import { WorkOrderRelationsService } from './work-order-relations.service';
import { WorkOrderActualCostsService } from './work-order-actual-costs.service';

describe('WorkOrderActualCostsService', () => {
  const workOrder = {
    id: 'wo-1',
    number: 1001,
    type: WorkOrderType.WORKSHOP,
    status: WorkOrderStatus.IN_PROGRESS,
    paymentStatus: PaymentStatus.PENDING,
    customerId: 'customer-1',
    vehicleId: 'vehicle-1',
    componentId: null,
    assignedEmployeeId: null,
    summary: 'Cambio de rodamiento',
    externalLink: null,
    notes: null,
    estimatedCompletionAt: null,
    estimatedCollectionAt: null,
    completedAt: null,
    createdAt: new Date('2026-05-10T20:00:00.000Z'),
    updatedAt: new Date('2026-05-10T20:00:00.000Z'),
    customer: { id: 'customer-1' },
    vehicle: null,
    component: null,
    assignedEmployee: null,
    workshopDetails: null,
    estimates: [],
    actualCosts: [],
    payments: [],
  };

  const directPurchaseCost: WorkOrderActualCostSummary = {
    id: 'cost-1',
    category: WorkOrderCostCategory.DIRECT_PURCHASE,
    description: 'Rodamiento SKF',
    amount: 150000,
    paymentMethod: PaymentMethod.TRANSFER,
    incurredAt: new Date('2026-05-10T18:00:00.000Z'),
    notes: 'Compra urgente',
    supplierId: 'supplier-1',
    inventoryItemId: 'inventory-1',
    supplierQuoteHistoryId: 'quote-1',
    supplier: { id: 'supplier-1', name: 'Proveedor Uno', isActive: true },
    inventoryItem: {
      id: 'inventory-1',
      name: 'Rodamiento SKF',
      sku: 'SKF-6203',
    },
    supplierQuoteHistory: {
      id: 'quote-1',
      supplierId: 'supplier-1',
      inventoryItemId: 'inventory-1',
      workOrderId: null,
      quotedCost: 145000,
      quotedAt: new Date('2026-05-09T15:00:00.000Z'),
      status: 'ACTIVE',
      supplier: null,
      inventoryItem: null,
    },
  };

  const createActualCostMock = jest.fn();
  const findActualCostsMock = jest.fn();
  const findActualCostByIdMock = jest.fn();
  const updateActualCostMock = jest.fn();
  const removeActualCostMock = jest.fn();
  const repository = {
    createActualCost: createActualCostMock,
    findActualCosts: findActualCostsMock,
    findActualCostById: findActualCostByIdMock,
    updateActualCost: updateActualCostMock,
    removeActualCost: removeActualCostMock,
  } as unknown as jest.Mocked<WorkOrdersRepository>;

  const readModelFindOneMock = jest.fn();
  const readModelService = {
    findOne: readModelFindOneMock,
  } as unknown as jest.Mocked<WorkOrderReadModelService>;

  const assertActualCostCreateRelationsMock = jest.fn();
  const assertActualCostUpdateRelationsMock = jest.fn();
  const relationsService = {
    assertActualCostCreateRelations: assertActualCostCreateRelationsMock,
    assertActualCostUpdateRelations: assertActualCostUpdateRelationsMock,
  } as unknown as jest.Mocked<WorkOrderRelationsService>;

  let service: WorkOrderActualCostsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkOrderActualCostsService(
      repository,
      readModelService,
      relationsService,
    );
  });

  it('creates and lists actual costs after validating the parent and direct-purchase links', async () => {
    const createDto: CreateWorkOrderActualCostDto = {
      category: WorkOrderCostCategory.DIRECT_PURCHASE,
      description: ' Rodamiento SKF ',
      amount: 150000,
      incurredAt: new Date('2026-05-10T18:00:00.000Z'),
      paymentMethod: PaymentMethod.TRANSFER,
      supplierId: ' supplier-1 ',
      inventoryItemId: ' inventory-1 ',
      supplierQuoteHistoryId: ' quote-1 ',
      notes: ' Compra urgente ',
    };

    readModelFindOneMock.mockResolvedValue(workOrder);
    assertActualCostCreateRelationsMock.mockResolvedValue({
      supplier: directPurchaseCost.supplier,
      inventoryItem: directPurchaseCost.inventoryItem,
      supplierQuoteHistory: directPurchaseCost.supplierQuoteHistory,
    });
    createActualCostMock.mockResolvedValue(directPurchaseCost);
    findActualCostsMock.mockResolvedValue([directPurchaseCost]);

    await expect(service.createActualCost('wo-1', createDto)).resolves.toEqual(
      directPurchaseCost,
    );
    await expect(service.findActualCosts('wo-1')).resolves.toEqual({
      data: [directPurchaseCost],
    });

    expect(readModelFindOneMock).toHaveBeenCalledWith('wo-1');
    expect(assertActualCostCreateRelationsMock).toHaveBeenCalledWith(createDto);
    expect(createActualCostMock).toHaveBeenCalledWith('wo-1', createDto);
    expect(findActualCostsMock).toHaveBeenCalledWith('wo-1');
  });

  it('updates and removes only the child actual cost while preserving the parent work order', async () => {
    readModelFindOneMock.mockResolvedValue(workOrder);
    findActualCostByIdMock.mockResolvedValue(directPurchaseCost);
    assertActualCostUpdateRelationsMock.mockResolvedValue({
      supplier: directPurchaseCost.supplier,
      inventoryItem: directPurchaseCost.inventoryItem,
      supplierQuoteHistory: directPurchaseCost.supplierQuoteHistory,
    });
    updateActualCostMock.mockResolvedValue({
      ...directPurchaseCost,
      description: 'Rodamiento SKF 6203',
      notes: null,
    });
    removeActualCostMock.mockResolvedValue(undefined);

    await expect(
      service.updateActualCost('wo-1', 'cost-1', {
        description: ' Rodamiento SKF 6203 ',
        notes: ' ',
      }),
    ).resolves.toMatchObject({
      id: 'cost-1',
      description: 'Rodamiento SKF 6203',
      supplier: { id: 'supplier-1' },
    });

    await expect(
      service.removeActualCost('wo-1', 'cost-1'),
    ).resolves.toBeUndefined();

    expect(findActualCostByIdMock).toHaveBeenCalledWith('wo-1', 'cost-1');
    expect(assertActualCostUpdateRelationsMock).toHaveBeenCalledWith(
      directPurchaseCost,
      expect.objectContaining({ description: ' Rodamiento SKF 6203 ' }),
    );
    expect(removeActualCostMock).toHaveBeenCalledWith('wo-1', 'cost-1');
  });

  it('fails before persistence when direct-purchase links are invalid', async () => {
    readModelFindOneMock.mockResolvedValue(workOrder);
    assertActualCostCreateRelationsMock.mockRejectedValue(
      new BadRequestException(
        'DIRECT_PURCHASE actual costs require a supplierId',
      ),
    );

    await expect(
      service.createActualCost('wo-1', {
        category: WorkOrderCostCategory.DIRECT_PURCHASE,
        description: 'Rodamiento SKF',
        amount: 150000,
        incurredAt: new Date('2026-05-10T18:00:00.000Z'),
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'DIRECT_PURCHASE actual costs require a supplierId',
      ),
    );

    expect(createActualCostMock).not.toHaveBeenCalled();
  });

  it('fails when updating a missing actual cost child', async () => {
    readModelFindOneMock.mockResolvedValue(workOrder);
    findActualCostByIdMock.mockResolvedValue(null);

    await expect(
      service.updateActualCost('wo-1', 'missing-cost', {
        description: 'Cambio',
      }),
    ).rejects.toThrow(
      new NotFoundException(
        'Actual cost missing-cost not found for work order wo-1',
      ),
    );

    expect(updateActualCostMock).not.toHaveBeenCalled();
  });
});
