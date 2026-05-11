import {
  PaymentStatus,
  WorkOrderStatus,
  WorkOrderType,
} from '../../../generated/prisma/enums';
import { CustomerAssetHistoryDateField } from '../dto/customer-asset-history-query.dto';
import {
  CustomerAssetHistoryRepository,
  type CustomerAssetHistoryScopeQuery,
} from './customer-asset-history.repository';

describe('CustomerAssetHistoryRepository', () => {
  it('looks up subjects and related assets with concise relation selects', async () => {
    const customerFindUnique = jest.fn().mockResolvedValue(null);
    const vehicleFindUnique = jest.fn().mockResolvedValue(null);
    const vehicleFindMany = jest.fn().mockResolvedValue([]);
    const componentFindUnique = jest.fn().mockResolvedValue(null);
    const componentFindMany = jest.fn().mockResolvedValue([]);

    const repository = new CustomerAssetHistoryRepository({
      customer: { findUnique: customerFindUnique },
      vehicle: { findUnique: vehicleFindUnique, findMany: vehicleFindMany },
      component: {
        findUnique: componentFindUnique,
        findMany: componentFindMany,
      },
      workOrder: { count: jest.fn(), findMany: jest.fn() },
    });

    await repository.findCustomerSubject('customer-1');
    await repository.findVehicleSubject('vehicle-1');
    await repository.findComponentSubject('component-1');
    await repository.findCustomerRelatedAssets('customer-1');
    await repository.findVehicleRelatedAssets('vehicle-1');
    await repository.findComponentRelatedAssets('component-1');

    expect(customerFindUnique).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      select: {
        id: true,
        name: true,
        phone: true,
        documentType: true,
        documentNumber: true,
        email: true,
      },
    });
    expect(vehicleFindUnique).toHaveBeenCalledWith({
      where: { id: 'vehicle-1' },
      select: {
        id: true,
        customerId: true,
        brand: true,
        modelReference: true,
        plate: true,
        Customer: { select: { id: true, name: true } },
      },
    });
    expect(componentFindUnique).toHaveBeenCalledWith({
      where: { id: 'component-1' },
      select: {
        id: true,
        customerId: true,
        vehicleId: true,
        brand: true,
        reference: true,
        identifier: true,
        Customer: { select: { id: true, name: true } },
        Vehicle: {
          select: { id: true, brand: true, modelReference: true, plate: true },
        },
        componentType: { select: { id: true, name: true } },
      },
    });
    expect(vehicleFindMany).toHaveBeenNthCalledWith(1, {
      where: { customerId: 'customer-1' },
      orderBy: [{ brand: 'asc' }, { plate: 'asc' }],
      select: { id: true, brand: true, modelReference: true, plate: true },
    });
    expect(vehicleFindMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'vehicle-1' },
      select: {
        Customer: { select: { id: true, name: true } },
        Component: {
          orderBy: [{ brand: 'asc' }, { reference: 'asc' }],
          select: { id: true, brand: true, reference: true, identifier: true },
        },
      },
    });
    expect(componentFindMany).toHaveBeenNthCalledWith(1, {
      where: { customerId: 'customer-1' },
      orderBy: [{ brand: 'asc' }, { reference: 'asc' }],
      select: { id: true, brand: true, reference: true, identifier: true },
    });
    expect(componentFindMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'component-1' },
      select: {
        Customer: { select: { id: true, name: true } },
        Vehicle: {
          select: { id: true, brand: true, modelReference: true, plate: true },
        },
      },
    });
  });

  it('builds stable scoped history queries with count, pagination, and relation selects', async () => {
    const count = jest.fn().mockResolvedValue(0);
    const findMany = jest.fn().mockResolvedValue([]);

    const repository = new CustomerAssetHistoryRepository({
      customer: { findUnique: jest.fn() },
      vehicle: { findUnique: jest.fn(), findMany: jest.fn() },
      component: { findUnique: jest.fn(), findMany: jest.fn() },
      workOrder: { count, findMany },
    });

    const query: CustomerAssetHistoryScopeQuery = {
      scope: 'customer',
      subjectId: 'customer-1',
      page: 2,
      limit: 10,
      dateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dateTo: new Date('2026-05-31T23:59:59.000Z'),
      dateField: CustomerAssetHistoryDateField.ESTIMATED_COLLECTION_AT,
      status: WorkOrderStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      type: WorkOrderType.WORKSHOP,
    };

    await repository.countScopedHistory(query);
    await repository.findScopedHistoryRows(query);
    await repository.findScopedHistoryFinancialRows(query);

    const expectedWhere = {
      customerId: 'customer-1',
      estimatedCollectionAt: {
        gte: new Date('2026-05-01T00:00:00.000Z'),
        lte: new Date('2026-05-31T23:59:59.000Z'),
      },
      status: WorkOrderStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      type: WorkOrderType.WORKSHOP,
    };

    expect(count).toHaveBeenCalledWith({ where: expectedWhere });
    expect(findMany).toHaveBeenNthCalledWith(1, {
      where: expectedWhere,
      orderBy: [{ estimatedCollectionAt: 'desc' }, { number: 'desc' }],
      skip: 10,
      take: 10,
      select: {
        id: true,
        number: true,
        type: true,
        status: true,
        paymentStatus: true,
        customerId: true,
        vehicleId: true,
        componentId: true,
        summary: true,
        createdAt: true,
        completedAt: true,
        estimatedCollectionAt: true,
        Customer: { select: { id: true, name: true } },
        Vehicle: {
          select: { id: true, brand: true, modelReference: true, plate: true },
        },
        Component: {
          select: { id: true, brand: true, reference: true, identifier: true },
        },
        Employee: {
          select: { id: true, name: true, type: true, isActive: true },
        },
        WorkshopWorkOrderDetails: {
          select: { customerReportedIssue: true, diagnosisSummary: true },
        },
        WorkOrderEstimate: {
          select: { phase: true, totalPriceAmount: true },
          orderBy: { createdAt: 'asc' },
        },
        WorkOrderPayment: {
          select: { id: true, amount: true },
        },
        WorkOrderActualCost: {
          select: { id: true, amount: true },
        },
      },
    });
    expect(findMany).toHaveBeenNthCalledWith(2, {
      where: expectedWhere,
      orderBy: [{ estimatedCollectionAt: 'desc' }, { number: 'desc' }],
      select: {
        id: true,
        number: true,
        type: true,
        status: true,
        paymentStatus: true,
        customerId: true,
        vehicleId: true,
        componentId: true,
        summary: true,
        createdAt: true,
        completedAt: true,
        estimatedCollectionAt: true,
        Customer: { select: { id: true, name: true } },
        Vehicle: {
          select: { id: true, brand: true, modelReference: true, plate: true },
        },
        Component: {
          select: { id: true, brand: true, reference: true, identifier: true },
        },
        Employee: {
          select: { id: true, name: true, type: true, isActive: true },
        },
        WorkshopWorkOrderDetails: {
          select: { customerReportedIssue: true, diagnosisSummary: true },
        },
        WorkOrderEstimate: {
          select: { phase: true, totalPriceAmount: true },
          orderBy: { createdAt: 'asc' },
        },
        WorkOrderPayment: {
          select: { id: true, amount: true },
        },
        WorkOrderActualCost: {
          select: { id: true, amount: true },
        },
      },
    });
  });

  it('switches history scoping between vehicle and component foreign keys', async () => {
    const count = jest.fn().mockResolvedValue(0);

    const repository = new CustomerAssetHistoryRepository({
      customer: { findUnique: jest.fn() },
      vehicle: { findUnique: jest.fn(), findMany: jest.fn() },
      component: { findUnique: jest.fn(), findMany: jest.fn() },
      workOrder: { count, findMany: jest.fn().mockResolvedValue([]) },
    });

    await repository.countScopedHistory({
      scope: 'vehicle',
      subjectId: 'vehicle-1',
      page: 1,
      limit: 10,
      dateField: CustomerAssetHistoryDateField.CREATED_AT,
    });
    await repository.countScopedHistory({
      scope: 'component',
      subjectId: 'component-1',
      page: 1,
      limit: 10,
      dateField: CustomerAssetHistoryDateField.CREATED_AT,
    });

    expect(count).toHaveBeenNthCalledWith(1, {
      where: { vehicleId: 'vehicle-1' },
    });
    expect(count).toHaveBeenNthCalledWith(2, {
      where: { componentId: 'component-1' },
    });
  });
});
