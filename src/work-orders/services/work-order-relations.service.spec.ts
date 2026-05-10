import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  EmployeeType,
  EstimateLineType,
  SupplierQuoteStatus,
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

    await expect(
      service.assertCreateRelations({
        type: WorkOrderType.WORKSHOP,
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
        componentId: 'component-1',
        assignedEmployeeId: 'employee-1',
        summary: 'Reparación de alternador',
      }),
    ).resolves.toEqual({
      customer: expect.objectContaining({ id: 'customer-1' }),
      vehicle: expect.objectContaining({ id: 'vehicle-1' }),
      component: expect.objectContaining({ id: 'component-1' }),
      assignedEmployee: expect.objectContaining({ id: 'employee-1' }),
    });
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
});
