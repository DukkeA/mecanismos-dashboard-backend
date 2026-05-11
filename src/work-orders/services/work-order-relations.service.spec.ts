import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  EmployeeType,
  EstimateLineType,
  SupplierQuoteStatus,
  WorkOrderCostCategory,
  WorkOrderType,
} from '../../../generated/prisma/enums';
import { WorkOrdersRepository } from '../persistence/work-orders.repository';
import { WorkOrderRelationsService } from './work-order-relations.service';

describe('WorkOrderRelationsService', () => {
  const repository = {
    findCustomerById: jest.fn(),
    findVehicleById: jest.fn(),
    findComponentById: jest.fn(),
    findEmployeeById: jest.fn(),
    findInventoryItemById: jest.fn(),
    findServiceCatalogById: jest.fn(),
    findSupplierById: jest.fn(),
    findSupplierQuoteHistoryById: jest.fn(),
  } as unknown as jest.Mocked<WorkOrdersRepository>;

  let service: WorkOrderRelationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkOrderRelationsService(repository);
  });

  it('accepts create relations when customer-owned links and employee exist', async () => {
    repository.findCustomerById.mockResolvedValue({
      id: 'customer-1',
      name: 'Cliente Uno',
      phone: '3000000000',
      documentType: 'CEDULA',
      documentNumber: '123',
      email: 'cliente@example.com',
    });
    repository.findVehicleById.mockResolvedValue({
      id: 'vehicle-1',
      customerId: 'customer-1',
      brand: 'Mazda',
      modelReference: 'BT-50',
      plate: 'ABC123',
    });
    repository.findComponentById.mockResolvedValue({
      id: 'component-1',
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      brand: 'Bosch',
      reference: 'ALT-90A',
      identifier: 'SER-100',
    });
    repository.findEmployeeById.mockResolvedValue({
      id: 'employee-1',
      name: 'Mecánico Uno',
      type: EmployeeType.MECHANIC,
      isActive: true,
    });

    const result = await service.assertCreateRelations({
      type: WorkOrderType.WORKSHOP,
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      componentId: 'component-1',
      assignedEmployeeId: 'employee-1',
      summary: 'Reparación de alternador',
    });

    expect(result.customer?.id).toBe('customer-1');
    expect(result.vehicle?.id).toBe('vehicle-1');
    expect(result.component?.id).toBe('component-1');
    expect(result.assignedEmployee?.id).toBe('employee-1');
  });

  it('rejects create relations when the customer is missing', async () => {
    repository.findCustomerById.mockResolvedValue(null);

    await expect(
      service.assertCreateRelations({
        type: WorkOrderType.SALE,
        customerId: 'missing-customer',
        summary: 'Venta mostrador',
      }),
    ).rejects.toThrow(
      new NotFoundException('Customer missing-customer not found'),
    );
  });

  it('rejects create relations when the vehicle belongs to another customer', async () => {
    repository.findCustomerById.mockResolvedValue({ id: 'customer-1' });
    repository.findVehicleById.mockResolvedValue({
      id: 'vehicle-2',
      customerId: 'customer-2',
    });

    await expect(
      service.assertCreateRelations({
        type: WorkOrderType.WORKSHOP,
        customerId: 'customer-1',
        vehicleId: 'vehicle-2',
        summary: 'Revisión',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Vehicle vehicle-2 does not belong to customer customer-1',
      ),
    );
  });

  it('rejects create relations when the component is linked to another selected vehicle', async () => {
    repository.findCustomerById.mockResolvedValue({ id: 'customer-1' });
    repository.findVehicleById.mockResolvedValue({
      id: 'vehicle-1',
      customerId: 'customer-1',
    });
    repository.findComponentById.mockResolvedValue({
      id: 'component-1',
      customerId: 'customer-1',
      vehicleId: 'vehicle-9',
    });

    await expect(
      service.assertCreateRelations({
        type: WorkOrderType.WORKSHOP,
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
        componentId: 'component-1',
        summary: 'Revisión',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Component component-1 does not belong to vehicle vehicle-1',
      ),
    );
  });

  it('accepts estimate-line links when linked records exist and supplier quotes match', async () => {
    repository.findInventoryItemById.mockResolvedValue({
      id: 'inventory-1',
      name: 'Rodamiento delantero',
      reference: 'ROD-01',
      identifier: 'INV-01',
      defaultSalePrice: 95000,
      isActive: true,
    });
    repository.findServiceCatalogById.mockResolvedValue({
      id: 'service-1',
      name: 'Diagnóstico eléctrico',
      slug: 'diagnostico-electrico',
      isActive: true,
    });
    repository.findSupplierById.mockResolvedValue({
      id: 'supplier-1',
      name: 'Proveedor Uno',
      type: 'COMPANY',
      isActive: true,
    });
    repository.findSupplierQuoteHistoryById.mockResolvedValue({
      id: 'quote-1',
      supplierId: 'supplier-1',
      inventoryItemId: 'inventory-1',
      workOrderId: 'wo-1',
      quotedCost: 60000,
      quotedAt: new Date('2026-05-10T20:00:00.000Z'),
      status: SupplierQuoteStatus.ACTIVE,
      supplier: {
        id: 'supplier-1',
        name: 'Proveedor Uno',
        type: 'COMPANY',
        isActive: true,
      },
      inventoryItem: {
        id: 'inventory-1',
        name: 'Rodamiento delantero',
        reference: 'ROD-01',
        identifier: 'INV-01',
        defaultSalePrice: 95000,
        isActive: true,
      },
    });

    await expect(
      service.assertEstimateLineRelations('wo-1', [
        {
          lineType: EstimateLineType.PART,
          description: 'Rodamiento delantero',
          inventoryItemId: 'inventory-1',
          supplierId: 'supplier-1',
          supplierQuoteHistoryId: 'quote-1',
        },
        {
          lineType: EstimateLineType.SERVICE,
          description: 'Diagnóstico eléctrico',
          serviceCatalogId: 'service-1',
        },
      ]),
    ).resolves.toBeUndefined();
  });

  it('rejects estimate-line links when the supplier quote does not match the selected supplier', async () => {
    repository.findSupplierById.mockResolvedValue({
      id: 'supplier-1',
      name: 'Proveedor Uno',
      type: 'COMPANY',
      isActive: true,
    });
    repository.findSupplierQuoteHistoryById.mockResolvedValue({
      id: 'quote-1',
      supplierId: 'supplier-9',
      inventoryItemId: 'inventory-1',
      workOrderId: 'wo-1',
      quotedCost: 60000,
      quotedAt: new Date('2026-05-10T20:00:00.000Z'),
      status: SupplierQuoteStatus.ACTIVE,
      supplier: null,
      inventoryItem: null,
    });

    await expect(
      service.assertEstimateLineRelations('wo-1', [
        {
          lineType: EstimateLineType.PART,
          description: 'Rodamiento delantero',
          supplierId: 'supplier-1',
          supplierQuoteHistoryId: 'quote-1',
        },
      ]),
    ).rejects.toThrow(
      new BadRequestException(
        'Supplier quote quote-1 does not belong to supplier supplier-1',
      ),
    );
  });

  it('rejects estimate-line links when the supplier quote belongs to another work order', async () => {
    repository.findSupplierById.mockResolvedValue({
      id: 'supplier-1',
      name: 'Proveedor Uno',
      type: 'COMPANY',
      isActive: true,
    });
    repository.findInventoryItemById.mockResolvedValue({
      id: 'inventory-1',
      name: 'Rodamiento delantero',
      reference: 'ROD-01',
      identifier: 'INV-01',
      defaultSalePrice: 95000,
      isActive: true,
    });
    repository.findSupplierQuoteHistoryById.mockResolvedValue({
      id: 'quote-1',
      supplierId: 'supplier-1',
      inventoryItemId: 'inventory-1',
      workOrderId: 'wo-locked',
      quotedCost: 60000,
      quotedAt: new Date('2026-05-10T20:00:00.000Z'),
      status: SupplierQuoteStatus.ACTIVE,
      supplier: null,
      inventoryItem: null,
    });

    await expect(
      service.assertEstimateLineRelations('wo-1', [
        {
          lineType: EstimateLineType.PART,
          description: 'Rodamiento delantero',
          inventoryItemId: 'inventory-1',
          supplierId: 'supplier-1',
          supplierQuoteHistoryId: 'quote-1',
        },
      ]),
    ).rejects.toThrow(
      new BadRequestException(
        'Supplier quote quote-1 does not belong to work order wo-1',
      ),
    );
  });

  it('accepts actual-cost direct-purchase links when supplier, inventory item, and quote align', async () => {
    repository.findSupplierById.mockResolvedValue({
      id: 'supplier-1',
      name: 'Proveedor Uno',
      type: 'COMPANY',
      isActive: true,
    });
    repository.findInventoryItemById.mockResolvedValue({
      id: 'inventory-1',
      name: 'Rodamiento SKF',
      reference: 'SKF-6203',
      identifier: 'INV-6203',
      defaultSalePrice: 180000,
      isActive: true,
    });
    repository.findSupplierQuoteHistoryById.mockResolvedValue({
      id: 'quote-1',
      supplierId: 'supplier-1',
      inventoryItemId: 'inventory-1',
      workOrderId: null,
      quotedCost: 145000,
      quotedAt: new Date('2026-05-09T15:00:00.000Z'),
      status: SupplierQuoteStatus.ACTIVE,
      supplier: {
        id: 'supplier-1',
        name: 'Proveedor Uno',
        type: 'COMPANY',
        isActive: true,
      },
      inventoryItem: {
        id: 'inventory-1',
        name: 'Rodamiento SKF',
        reference: 'SKF-6203',
        identifier: 'INV-6203',
        defaultSalePrice: 180000,
        isActive: true,
      },
    });

    const result = await service.assertActualCostCreateRelations({
      category: WorkOrderCostCategory.DIRECT_PURCHASE,
      description: 'Rodamiento SKF',
      amount: 150000,
      incurredAt: new Date('2026-05-10T18:00:00.000Z'),
      supplierId: 'supplier-1',
      inventoryItemId: 'inventory-1',
      supplierQuoteHistoryId: 'quote-1',
    });

    expect(result.supplier?.id).toBe('supplier-1');
    expect(result.inventoryItem?.id).toBe('inventory-1');
    expect(result.supplierQuoteHistory?.id).toBe('quote-1');
  });

  it('accepts work-order inventory links when stock items and quotes belong to the same order', async () => {
    repository.findInventoryItemById.mockResolvedValue({
      id: 'inventory-1',
      name: 'Inyector Bosch',
      reference: '0445120231',
      identifier: 'INV-1',
      defaultSalePrice: 250000,
      isActive: true,
      itemType: 'STOCK_OWNED',
    });
    repository.findSupplierById.mockResolvedValue({
      id: 'supplier-1',
      name: 'Proveedor Uno',
      type: 'COMPANY',
      isActive: true,
    });
    repository.findSupplierQuoteHistoryById.mockResolvedValue({
      id: 'quote-1',
      supplierId: 'supplier-1',
      inventoryItemId: 'inventory-1',
      workOrderId: 'wo-1',
      quotedCost: 180000,
      quotedAt: new Date('2026-05-10T18:00:00.000Z'),
      status: SupplierQuoteStatus.ACTIVE,
      supplier: null,
      inventoryItem: null,
    });

    await expect(
      service.assertInventoryActionRelations('wo-1', {
        inventoryItemId: 'inventory-1',
        supplierId: 'supplier-1',
        supplierQuoteHistoryId: 'quote-1',
      }),
    ).resolves.toMatchObject({
      inventoryItem: { id: 'inventory-1', itemType: 'STOCK_OWNED' },
      supplier: { id: 'supplier-1' },
      supplierQuoteHistory: { id: 'quote-1' },
    });
  });

  it('rejects work-order inventory links when the item or quote is inconsistent', async () => {
    repository.findInventoryItemById.mockResolvedValue(null);

    await expect(
      service.assertInventoryActionRelations('wo-1', {
        inventoryItemId: 'missing-item',
      }),
    ).rejects.toThrow(
      new NotFoundException('Inventory item missing-item not found'),
    );

    repository.findInventoryItemById.mockResolvedValue({
      id: 'inventory-1',
      name: 'Inyector Bosch',
      reference: '0445120231',
      identifier: 'INV-1',
      defaultSalePrice: 250000,
      isActive: true,
      itemType: 'STOCK_OWNED',
    });
    repository.findSupplierQuoteHistoryById.mockResolvedValue({
      id: 'quote-1',
      supplierId: 'supplier-1',
      inventoryItemId: 'inventory-9',
      workOrderId: 'wo-1',
      quotedCost: 180000,
      quotedAt: new Date('2026-05-10T18:00:00.000Z'),
      status: SupplierQuoteStatus.ACTIVE,
      supplier: null,
      inventoryItem: null,
    });

    await expect(
      service.assertInventoryActionRelations('wo-1', {
        inventoryItemId: 'inventory-1',
        supplierQuoteHistoryId: 'quote-1',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Supplier quote quote-1 does not belong to inventory item inventory-1',
      ),
    );
  });

  it('rejects actual-cost direct purchases without a supplier or with mismatched quote links', async () => {
    await expect(
      service.assertActualCostCreateRelations({
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

    repository.findSupplierById.mockResolvedValue({
      id: 'supplier-1',
      name: 'Proveedor Uno',
      type: 'COMPANY',
      isActive: true,
    });
    repository.findInventoryItemById.mockResolvedValue({
      id: 'inventory-1',
      name: 'Rodamiento SKF',
      reference: 'SKF-6203',
      identifier: 'INV-6203',
      defaultSalePrice: 180000,
      isActive: true,
    });
    repository.findSupplierQuoteHistoryById.mockResolvedValue({
      id: 'quote-1',
      supplierId: 'supplier-2',
      inventoryItemId: 'inventory-1',
      workOrderId: null,
      quotedCost: 145000,
      quotedAt: new Date('2026-05-09T15:00:00.000Z'),
      status: SupplierQuoteStatus.ACTIVE,
      supplier: null,
      inventoryItem: null,
    });

    await expect(
      service.assertActualCostCreateRelations({
        category: WorkOrderCostCategory.DIRECT_PURCHASE,
        description: 'Rodamiento SKF',
        amount: 150000,
        incurredAt: new Date('2026-05-10T18:00:00.000Z'),
        supplierId: 'supplier-1',
        inventoryItemId: 'inventory-1',
        supplierQuoteHistoryId: 'quote-1',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Supplier quote quote-1 does not belong to supplier supplier-1',
      ),
    );
  });
});
