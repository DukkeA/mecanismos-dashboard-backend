import { NotFoundException } from '@nestjs/common';
import { EstimatePhase } from '../../generated/prisma/enums';
import { CustomerAssetHistoryService } from './customer-asset-history.service';
import {
  CustomerAssetHistoryDateField,
  type CustomerAssetHistoryQueryDto,
} from './dto/customer-asset-history-query.dto';
import { type CustomerAssetHistoryRepository } from './persistence/customer-asset-history.repository';

describe('CustomerAssetHistoryService', () => {
  const baseQuery: CustomerAssetHistoryQueryDto = {
    page: 1,
    limit: 10,
    dateField: CustomerAssetHistoryDateField.CREATED_AT,
  };

  let repository: jest.Mocked<CustomerAssetHistoryRepository>;
  let service: CustomerAssetHistoryService;

  beforeEach(() => {
    repository = {
      findCustomerSubject: jest.fn(),
      findVehicleSubject: jest.fn(),
      findComponentSubject: jest.fn(),
      findCustomerRelatedAssets: jest.fn(),
      findVehicleRelatedAssets: jest.fn(),
      findComponentRelatedAssets: jest.fn(),
      countScopedHistory: jest.fn(),
      findScopedHistoryRows: jest.fn(),
      findScopedHistoryFinancialRows: jest.fn(),
    } as unknown as jest.Mocked<CustomerAssetHistoryRepository>;

    service = new CustomerAssetHistoryService(repository);
  });

  it('builds customer history with related assets, mapped rows, and reporting-aligned totals', async () => {
    const rows = [
      {
        id: 'seed-work-order-workshop-unknown-payable',
        number: 1004,
        type: 'WORKSHOP',
        status: 'IN_PROGRESS',
        paymentStatus: 'PARTIAL',
        customerId: 'seed-customer-acme-industrial',
        vehicleId: 'seed-vehicle-acme-foton-aumark',
        componentId: 'seed-component-acme-inyector',
        summary: 'Trabajo asignado sin estimate publicado',
        createdAt: new Date('2026-05-20T10:00:00.000Z'),
        completedAt: null,
        estimatedCollectionAt: new Date('2026-05-21T18:00:00.000Z'),
        Customer: { id: 'seed-customer-acme-industrial', name: 'Acme Industrial SAS' },
        Vehicle: {
          id: 'seed-vehicle-acme-foton-aumark',
          brand: 'Foton',
          modelReference: 'Aumark BJ1049',
          plate: 'ABC123',
        },
        Component: {
          id: 'seed-component-acme-inyector',
          brand: 'Bosch',
          reference: '0445120231',
          identifier: 'INY-ACME-001',
        },
        Employee: {
          id: 'seed-employee-ana-torres',
          name: 'Ana Torres',
          type: 'MECHANIC',
          isActive: true,
        },
        WorkshopWorkOrderDetails: {
          customerReportedIssue: 'Pendiente definición de alcance final',
          diagnosisSummary: 'Ya hay costos y un anticipo',
        },
        WorkOrderEstimate: [],
        WorkOrderPayment: [{ id: 'payment-1', amount: 30000 }],
        WorkOrderActualCost: [{ id: 'cost-1', amount: 70000 }],
      },
      {
        id: 'seed-work-order-workshop-injector-repair',
        number: 1002,
        type: 'WORKSHOP',
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        customerId: 'seed-customer-acme-industrial',
        vehicleId: 'seed-vehicle-acme-foton-aumark',
        componentId: 'seed-component-acme-inyector',
        summary: 'Reparación integral de inyector Bosch',
        createdAt: new Date('2026-05-08T09:00:00.000Z'),
        completedAt: new Date('2026-05-09T13:30:00.000Z'),
        estimatedCollectionAt: new Date('2026-05-09T15:00:00.000Z'),
        Customer: { id: 'seed-customer-acme-industrial', name: 'Acme Industrial SAS' },
        Vehicle: {
          id: 'seed-vehicle-acme-foton-aumark',
          brand: 'Foton',
          modelReference: 'Aumark BJ1049',
          plate: 'ABC123',
        },
        Component: {
          id: 'seed-component-acme-inyector',
          brand: 'Bosch',
          reference: '0445120231',
          identifier: 'INY-ACME-001',
        },
        Employee: {
          id: 'seed-employee-ana-torres',
          name: 'Ana Torres',
          type: 'MECHANIC',
          isActive: true,
        },
        WorkshopWorkOrderDetails: {
          customerReportedIssue: 'El inyector presenta retorno excesivo',
          diagnosisSummary: 'Se confirmó desgaste interno',
        },
        WorkOrderEstimate: [
          { phase: EstimatePhase.FINAL, totalPriceAmount: 620000 },
        ],
        WorkOrderPayment: [{ id: 'payment-2', amount: 620000 }],
        WorkOrderActualCost: [{ id: 'cost-2', amount: 182000 }],
      },
    ];

    repository.findCustomerSubject.mockResolvedValue({
      id: 'seed-customer-acme-industrial',
      name: 'Acme Industrial SAS',
      phone: '3001234567',
      documentType: 'NIT',
      documentNumber: '900123456',
      email: 'compras@acme-industrial.test',
    });
    repository.findCustomerRelatedAssets.mockResolvedValue({
      vehicles: [
        {
          id: 'seed-vehicle-acme-foton-aumark',
          brand: 'Foton',
          modelReference: 'Aumark BJ1049',
          plate: 'ABC123',
        },
      ],
      components: [
        {
          id: 'seed-component-acme-inyector',
          brand: 'Bosch',
          reference: '0445120231',
          identifier: 'INY-ACME-001',
        },
      ],
    });
    repository.countScopedHistory.mockResolvedValue(2);
    repository.findScopedHistoryRows.mockResolvedValue(rows);
    repository.findScopedHistoryFinancialRows.mockResolvedValue(rows);

    const response = await service.getCustomerHistory(
      'seed-customer-acme-industrial',
      baseQuery,
    );

    expect(response.subject).toMatchObject({
      id: 'seed-customer-acme-industrial',
      scope: 'CUSTOMER',
      label: 'Acme Industrial SAS',
    });
    expect(response.relatedAssets.vehicles).toEqual([
      {
        id: 'seed-vehicle-acme-foton-aumark',
        label: 'Foton Aumark BJ1049 · ABC123',
      },
    ]);
    expect(response.relatedAssets.components).toEqual([
      {
        id: 'seed-component-acme-inyector',
        label: 'Bosch 0445120231 · INY-ACME-001',
      },
    ]);
    expect(response.summary).toEqual({
      totalWorkOrders: 2,
      unknownPayableCount: 1,
      payableAmount: 620000,
      paidTotal: 650000,
      balance: 0,
      actualCostTotal: 252000,
    });
    expect(response.data[0]).toMatchObject({
      workOrderId: 'seed-work-order-workshop-unknown-payable',
      assetLabel: 'Bosch 0445120231 · INY-ACME-001',
      latestWorkshopSignal: 'Ya hay costos y un anticipo',
      payableAmount: null,
      paidTotal: 30000,
      balance: null,
      actualCostTotal: 70000,
      links: {
        workOrderId: 'seed-work-order-workshop-unknown-payable',
        customerId: 'seed-customer-acme-industrial',
        vehicleId: 'seed-vehicle-acme-foton-aumark',
        componentId: 'seed-component-acme-inyector',
      },
    });
    expect(response.meta).toEqual({
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    });
  });

  it('returns zero totals for an existing customer with empty history', async () => {
    repository.findCustomerSubject.mockResolvedValue({
      id: 'customer-1',
      name: 'Ana Gomez',
      phone: '300',
      documentType: 'CEDULA',
      documentNumber: '123',
      email: 'ana@test.dev',
    });
    repository.findCustomerRelatedAssets.mockResolvedValue({
      vehicles: [],
      components: [],
    });
    repository.countScopedHistory.mockResolvedValue(0);
    repository.findScopedHistoryRows.mockResolvedValue([]);
    repository.findScopedHistoryFinancialRows.mockResolvedValue([]);

    const response = await service.getCustomerHistory('customer-1', baseQuery);

    expect(response.summary).toEqual({
      totalWorkOrders: 0,
      unknownPayableCount: 0,
      payableAmount: 0,
      paidTotal: 0,
      balance: 0,
      actualCostTotal: 0,
    });
    expect(response.data).toEqual([]);
    expect(response.meta.totalPages).toBe(0);
  });

  it('rejects missing subjects before returning unrelated history', async () => {
    repository.findCustomerSubject.mockResolvedValue(null);

    await expect(
      service.getCustomerHistory('missing-customer', baseQuery),
    ).rejects.toThrow(new NotFoundException('Customer missing-customer not found'));
    expect(repository.countScopedHistory).not.toHaveBeenCalled();
  });

  it('builds vehicle and component responses with scoped related assets and the same contract', async () => {
    repository.findVehicleSubject.mockResolvedValue({
      id: 'vehicle-1',
      customerId: 'customer-1',
      brand: 'Toyota',
      modelReference: 'Hilux 2.8',
      plate: 'XYZ987',
      Customer: { id: 'customer-1', name: 'Ana Gomez' },
    });
    repository.findVehicleRelatedAssets.mockResolvedValue({
      customer: { id: 'customer-1', name: 'Ana Gomez' },
      components: [
        {
          id: 'component-1',
          brand: 'Denso',
          reference: 'DLLA158P854',
          identifier: 'TOB-ANA-001',
        },
      ],
    });
    repository.findComponentSubject.mockResolvedValue({
      id: 'component-1',
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      brand: 'Denso',
      reference: 'DLLA158P854',
      identifier: 'TOB-ANA-001',
      Customer: { id: 'customer-1', name: 'Ana Gomez' },
      Vehicle: {
        id: 'vehicle-1',
        brand: 'Toyota',
        modelReference: 'Hilux 2.8',
        plate: 'XYZ987',
      },
      componentType: { id: 'type-1', name: 'Tobera' },
    });
    repository.findComponentRelatedAssets.mockResolvedValue({
      customer: { id: 'customer-1', name: 'Ana Gomez' },
      vehicle: {
        id: 'vehicle-1',
        brand: 'Toyota',
        modelReference: 'Hilux 2.8',
        plate: 'XYZ987',
      },
    });
    repository.countScopedHistory.mockResolvedValue(1);
    repository.findScopedHistoryRows.mockResolvedValue([
      {
        id: 'work-order-1',
        number: 1003,
        type: 'WORKSHOP',
        status: 'IN_PROGRESS',
        paymentStatus: 'PARTIAL',
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
        componentId: 'component-1',
        summary: 'Servicio parcial con anticipo y saldo pendiente',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        completedAt: null,
        estimatedCollectionAt: new Date('2026-05-19T15:00:00.000Z'),
        Customer: { id: 'customer-1', name: 'Ana Gomez' },
        Vehicle: {
          id: 'vehicle-1',
          brand: 'Toyota',
          modelReference: 'Hilux 2.8',
          plate: 'XYZ987',
        },
        Component: {
          id: 'component-1',
          brand: 'Denso',
          reference: 'DLLA158P854',
          identifier: 'TOB-ANA-001',
        },
        Employee: null,
        WorkshopWorkOrderDetails: {
          customerReportedIssue: 'El vehículo presenta falla intermitente',
          diagnosisSummary: null,
        },
        WorkOrderEstimate: [
          { phase: EstimatePhase.FINAL, totalPriceAmount: 250000 },
        ],
        WorkOrderPayment: [{ id: 'payment-1', amount: 100000 }],
        WorkOrderActualCost: [{ id: 'cost-1', amount: 110000 }],
      },
    ]);
    repository.findScopedHistoryFinancialRows.mockResolvedValue([
      {
        id: 'work-order-1',
        number: 1003,
        type: 'WORKSHOP',
        status: 'IN_PROGRESS',
        paymentStatus: 'PARTIAL',
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
        componentId: 'component-1',
        summary: 'Servicio parcial con anticipo y saldo pendiente',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        completedAt: null,
        estimatedCollectionAt: new Date('2026-05-19T15:00:00.000Z'),
        Customer: { id: 'customer-1', name: 'Ana Gomez' },
        Vehicle: {
          id: 'vehicle-1',
          brand: 'Toyota',
          modelReference: 'Hilux 2.8',
          plate: 'XYZ987',
        },
        Component: {
          id: 'component-1',
          brand: 'Denso',
          reference: 'DLLA158P854',
          identifier: 'TOB-ANA-001',
        },
        Employee: null,
        WorkshopWorkOrderDetails: {
          customerReportedIssue: 'El vehículo presenta falla intermitente',
          diagnosisSummary: null,
        },
        WorkOrderEstimate: [
          { phase: EstimatePhase.FINAL, totalPriceAmount: 250000 },
        ],
        WorkOrderPayment: [{ id: 'payment-1', amount: 100000 }],
        WorkOrderActualCost: [{ id: 'cost-1', amount: 110000 }],
      },
    ]);

    const vehicleResponse = await service.getVehicleHistory('vehicle-1', baseQuery);
    const componentResponse = await service.getComponentHistory(
      'component-1',
      baseQuery,
    );

    expect(vehicleResponse.subject).toMatchObject({
      id: 'vehicle-1',
      scope: 'VEHICLE',
      label: 'Toyota Hilux 2.8 · XYZ987',
    });
    expect(vehicleResponse.relatedAssets.customer).toEqual({
      id: 'customer-1',
      label: 'Ana Gomez',
    });
    expect(vehicleResponse.relatedAssets.components).toEqual([
      { id: 'component-1', label: 'Denso DLLA158P854 · TOB-ANA-001' },
    ]);
    expect(componentResponse.subject).toMatchObject({
      id: 'component-1',
      scope: 'COMPONENT',
      label: 'Denso DLLA158P854 · TOB-ANA-001',
      componentTypeName: 'Tobera',
    });
    expect(componentResponse.relatedAssets.vehicle).toEqual({
      id: 'vehicle-1',
      label: 'Toyota Hilux 2.8 · XYZ987',
    });
    expect(repository.countScopedHistory).toHaveBeenNthCalledWith(1, {
      ...baseQuery,
      scope: 'vehicle',
      subjectId: 'vehicle-1',
    });
    expect(repository.countScopedHistory).toHaveBeenNthCalledWith(2, {
      ...baseQuery,
      scope: 'component',
      subjectId: 'component-1',
    });
  });
});
