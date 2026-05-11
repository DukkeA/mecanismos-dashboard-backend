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
      quotedCost: 145000,
      quotedAt: new Date('2026-05-09T15:00:00.000Z'),
      status: 'ACTIVE',
    },
  };

  const repository = {
    createActualCost: jest.fn(),
    findActualCosts: jest.fn(),
    findActualCostById: jest.fn(),
    updateActualCost: jest.fn(),
    removeActualCost: jest.fn(),
  } as unknown as jest.Mocked<WorkOrdersRepository>;

  const readModelService = {
    findOne: jest.fn(),
  } as unknown as jest.Mocked<WorkOrderReadModelService>;

  const relationsService = {
    assertActualCostCreateRelations: jest.fn(),
    assertActualCostUpdateRelations: jest.fn(),
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

    readModelService.findOne.mockResolvedValue(workOrder);
    relationsService.assertActualCostCreateRelations.mockResolvedValue({
      supplier: directPurchaseCost.supplier,
      inventoryItem: directPurchaseCost.inventoryItem,
      supplierQuoteHistory: directPurchaseCost.supplierQuoteHistory,
    } as never);
    repository.createActualCost.mockResolvedValue(directPurchaseCost);
    repository.findActualCosts.mockResolvedValue([directPurchaseCost]);

    await expect(service.createActualCost('wo-1', createDto)).resolves.toEqual(
      directPurchaseCost,
    );
    await expect(service.findActualCosts('wo-1')).resolves.toEqual({
      data: [directPurchaseCost],
    });

    expect(readModelService.findOne).toHaveBeenCalledWith('wo-1');
    expect(
      relationsService.assertActualCostCreateRelations,
    ).toHaveBeenCalledWith(createDto);
    expect(repository.createActualCost).toHaveBeenCalledWith('wo-1', createDto);
    expect(repository.findActualCosts).toHaveBeenCalledWith('wo-1');
  });

  it('updates and removes only the child actual cost while preserving the parent work order', async () => {
    readModelService.findOne.mockResolvedValue(workOrder);
    repository.findActualCostById.mockResolvedValue(directPurchaseCost);
    relationsService.assertActualCostUpdateRelations.mockResolvedValue({
      supplier: directPurchaseCost.supplier,
      inventoryItem: directPurchaseCost.inventoryItem,
      supplierQuoteHistory: directPurchaseCost.supplierQuoteHistory,
    } as never);
    repository.updateActualCost.mockResolvedValue({
      ...directPurchaseCost,
      description: 'Rodamiento SKF 6203',
      notes: null,
    });
    repository.removeActualCost.mockResolvedValue(undefined);

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

    expect(repository.findActualCostById).toHaveBeenCalledWith(
      'wo-1',
      'cost-1',
    );
    expect(
      relationsService.assertActualCostUpdateRelations,
    ).toHaveBeenCalledWith(
      directPurchaseCost,
      expect.objectContaining({ description: ' Rodamiento SKF 6203 ' }),
    );
    expect(repository.removeActualCost).toHaveBeenCalledWith('wo-1', 'cost-1');
  });

  it('fails before persistence when direct-purchase links are invalid', async () => {
    readModelService.findOne.mockResolvedValue(workOrder);
    relationsService.assertActualCostCreateRelations.mockRejectedValue(
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

    expect(repository.createActualCost).not.toHaveBeenCalled();
  });

  it('fails when updating a missing actual cost child', async () => {
    readModelService.findOne.mockResolvedValue(workOrder);
    repository.findActualCostById.mockResolvedValue(null);

    await expect(
      service.updateActualCost('wo-1', 'missing-cost', {
        description: 'Cambio',
      }),
    ).rejects.toThrow(
      new NotFoundException(
        'Actual cost missing-cost not found for work order wo-1',
      ),
    );

    expect(repository.updateActualCost).not.toHaveBeenCalled();
  });
});
