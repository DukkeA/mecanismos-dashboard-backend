/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException } from '@nestjs/common';
import {
  EstimateLineType,
  EstimatePhase,
  PaymentMethod,
  PaymentStatus,
  SupplierQuoteStatus,
  WorkOrderCostCategory,
  WorkOrderStatus,
  WorkOrderType,
} from '../../../generated/prisma/enums';
import {
  WorkOrderInventoryReservationConflictError,
  WorkOrdersRepository,
} from './work-orders.repository';

describe('WorkOrdersRepository', () => {
  it('creates one workshop detail transactionally for workshop work orders', async () => {
    type CreateArgs = {
      data: Record<string, unknown>;
      include: Record<string, unknown>;
    };
    type WorkshopDetailCreateArgs = {
      data: Record<string, unknown>;
    };

    let receivedCreateArgs: CreateArgs | undefined;
    let receivedWorkshopDetailCreateArgs: WorkshopDetailCreateArgs | undefined;

    const tx = {
      workOrder: {
        create: jest.fn((args: CreateArgs) => {
          receivedCreateArgs = args;

          return Promise.resolve({
            id: 'wo-workshop-1',
            number: 1002,
            type: WorkOrderType.WORKSHOP,
            status: WorkOrderStatus.IN_PROGRESS,
            paymentStatus: PaymentStatus.PENDING,
            customerId: 'customer-1',
            vehicleId: 'vehicle-1',
            componentId: 'component-1',
            assignedEmployeeId: null,
            summary: 'Diagnóstico de alternador',
            externalLink: null,
            notes: null,
            estimatedCompletionAt: null,
            estimatedCollectionAt: null,
            completedAt: null,
            createdAt: new Date('2026-05-10T20:00:00.000Z'),
            updatedAt: new Date('2026-05-10T20:00:00.000Z'),
            Customer: {
              id: 'customer-1',
              name: 'Cliente Uno',
              phone: '3000000000',
              documentType: 'CEDULA',
              documentNumber: '123',
              email: 'cliente@example.com',
            },
            Vehicle: {
              id: 'vehicle-1',
              customerId: 'customer-1',
              brand: 'Mazda',
              modelReference: 'BT-50',
              plate: 'ABC123',
            },
            Component: {
              id: 'component-1',
              customerId: 'customer-1',
              vehicleId: 'vehicle-1',
              brand: 'Bosch',
              reference: 'ALT-90A',
              identifier: 'SER-100',
            },
            Employee: null,
            WorkshopWorkOrderDetails: null,
            WorkOrderEstimate: [],
            WorkOrderActualCost: [],
            WorkOrderPayment: [],
          });
        }),
        findUnique: jest.fn(() =>
          Promise.resolve({
            id: 'wo-workshop-1',
            number: 1002,
            type: WorkOrderType.WORKSHOP,
            status: WorkOrderStatus.IN_PROGRESS,
            paymentStatus: PaymentStatus.PENDING,
            customerId: 'customer-1',
            vehicleId: 'vehicle-1',
            componentId: 'component-1',
            assignedEmployeeId: null,
            summary: 'Diagnóstico de alternador',
            externalLink: null,
            notes: null,
            estimatedCompletionAt: null,
            estimatedCollectionAt: null,
            completedAt: null,
            createdAt: new Date('2026-05-10T20:00:00.000Z'),
            updatedAt: new Date('2026-05-10T20:00:00.000Z'),
            Customer: {
              id: 'customer-1',
              name: 'Cliente Uno',
              phone: '3000000000',
              documentType: 'CEDULA',
              documentNumber: '123',
              email: 'cliente@example.com',
            },
            Vehicle: {
              id: 'vehicle-1',
              customerId: 'customer-1',
              brand: 'Mazda',
              modelReference: 'BT-50',
              plate: 'ABC123',
            },
            Component: {
              id: 'component-1',
              customerId: 'customer-1',
              vehicleId: 'vehicle-1',
              brand: 'Bosch',
              reference: 'ALT-90A',
              identifier: 'SER-100',
            },
            Employee: null,
            WorkshopWorkOrderDetails: {
              id: 'workshop-detail-1',
              customerReportedIssue: 'No enciende',
              diagnosisRequired: true,
              diagnosisSummary: 'Revisar alternador primero',
            },
            WorkOrderEstimate: [],
            WorkOrderActualCost: [],
            WorkOrderPayment: [],
          }),
        ),
      },
      workshopWorkOrderDetails: {
        create: jest.fn((args: WorkshopDetailCreateArgs) => {
          receivedWorkshopDetailCreateArgs = args;
          return Promise.resolve({
            id: 'workshop-detail-1',
            workOrderId: 'wo-workshop-1',
            customerReportedIssue: 'No enciende',
            diagnosisRequired: true,
            diagnosisSummary: 'Revisar alternador primero',
          });
        }),
      },
    };

    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };

    const repository = new WorkOrdersRepository(prisma as never);

    await expect(
      repository.create({
        type: WorkOrderType.WORKSHOP,
        customerId: ' customer-1 ',
        vehicleId: ' vehicle-1 ',
        componentId: ' component-1 ',
        summary: ' Diagnóstico de alternador ',
        customerReportedIssue: ' No enciende ',
        diagnosisRequired: true,
        diagnosisSummary: ' Revisar alternador primero ',
      }),
    ).resolves.toMatchObject({
      id: 'wo-workshop-1',
      workshopDetails: {
        id: 'workshop-detail-1',
        customerReportedIssue: 'No enciende',
        diagnosisRequired: true,
        diagnosisSummary: 'Revisar alternador primero',
      },
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(receivedCreateArgs?.data).toMatchObject({
      type: WorkOrderType.WORKSHOP,
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      componentId: 'component-1',
      summary: 'Diagnóstico de alternador',
    });
    expect(receivedWorkshopDetailCreateArgs?.data).toMatchObject({
      id: expect.any(String),
      workOrderId: 'wo-workshop-1',
      customerReportedIssue: 'No enciende',
      diagnosisRequired: true,
      diagnosisSummary: 'Revisar alternador primero',
    });
  });

  it('creates work orders with trimmed optional values and included read-model relations', async () => {
    type CreateArgs = {
      data: Record<string, unknown>;
      include: Record<string, unknown>;
    };

    let receivedCreateArgs: CreateArgs | undefined;

    const prisma = {
      workOrder: {
        create: jest.fn((args: CreateArgs) => {
          receivedCreateArgs = args;

          return Promise.resolve({
            id: 'wo-1',
            number: 1001,
            type: WorkOrderType.SALE,
            status: WorkOrderStatus.IN_PROGRESS,
            paymentStatus: PaymentStatus.PENDING,
            customerId: 'customer-1',
            vehicleId: null,
            componentId: null,
            assignedEmployeeId: null,
            summary: 'Venta de repuesto',
            externalLink: 'https://example.com/orders/1001',
            notes: 'Cliente espera hoy',
            estimatedCompletionAt: null,
            estimatedCollectionAt: null,
            completedAt: null,
            createdAt: new Date('2026-05-10T20:00:00.000Z'),
            updatedAt: new Date('2026-05-10T20:00:00.000Z'),
            Customer: {
              id: 'customer-1',
              name: 'Cliente Uno',
              phone: '3000000000',
              documentType: 'CEDULA',
              documentNumber: '123',
              email: 'cliente@example.com',
            },
            Vehicle: null,
            Component: null,
            Employee: null,
            WorkshopWorkOrderDetails: null,
            WorkOrderEstimate: [],
            WorkOrderActualCost: [],
            WorkOrderPayment: [],
          });
        }),
      },
    };

    const repository = new WorkOrdersRepository(prisma as never);

    await expect(
      repository.create({
        type: WorkOrderType.SALE,
        customerId: ' customer-1 ',
        summary: ' Venta de repuesto ',
        externalLink: ' https://example.com/orders/1001 ',
        notes: ' Cliente espera hoy ',
      }),
    ).resolves.toMatchObject({
      id: 'wo-1',
      customer: { id: 'customer-1' },
      actualCosts: [],
      payments: [],
    });

    expect(receivedCreateArgs?.data).toMatchObject({
      id: expect.any(String),
      type: WorkOrderType.SALE,
      customerId: 'customer-1',
      summary: 'Venta de repuesto',
      externalLink: 'https://example.com/orders/1001',
      notes: 'Cliente espera hoy',
      status: WorkOrderStatus.IN_PROGRESS,
      paymentStatus: PaymentStatus.PENDING,
      updatedAt: expect.any(Date),
    });
    expect(receivedCreateArgs?.include).toEqual(
      expect.objectContaining({
        Customer: true,
        WorkOrderActualCost: expect.any(Object),
        WorkOrderPayment: expect.any(Object),
      }),
    );
  });

  it('creates work-order inventory actions atomically and returns refreshed inventory summaries', async () => {
    const tx = {
      inventoryItem: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            id: 'item-1',
            name: 'Inyector Bosch',
            reference: '0445120231',
            identifier: 'INV-1',
            defaultSalePrice: 250000,
            isActive: true,
            itemType: 'STOCK_OWNED',
          }),
        ),
      },
      inventoryMovement: {
        findMany: jest.fn(() =>
          Promise.resolve([
            {
              id: 'movement-stock-in',
              inventoryItemId: 'item-1',
              movementType: 'IN',
              reason: 'PURCHASE',
              quantity: 5,
              unitCost: 180000,
              supplierId: 'supplier-1',
              workOrderId: null,
              isReservedForWorkOrder: false,
              occurredAt: new Date('2026-05-10T08:00:00.000Z'),
              notes: null,
              createdAt: new Date('2026-05-10T08:00:00.000Z'),
            },
          ]),
        ),
        create: jest.fn(() =>
          Promise.resolve({
            id: 'movement-1',
            inventoryItemId: 'item-1',
            movementType: 'OUT',
            reason: 'WORK_ORDER_CONSUMPTION',
            quantity: 2,
            unitCost: 180000,
            supplierId: 'supplier-1',
            workOrderId: 'wo-1',
            isReservedForWorkOrder: false,
            occurredAt: new Date('2026-05-11T10:00:00.000Z'),
            notes: 'Consumo final',
            createdAt: new Date('2026-05-11T10:00:00.000Z'),
          }),
        ),
      },
      workOrderActualCost: {
        create: jest.fn(() =>
          Promise.resolve({
            id: 'cost-1',
            category: 'DIRECT_PURCHASE',
            description: 'Consumo final',
            amount: 360000,
            supplierId: 'supplier-1',
            inventoryItemId: 'item-1',
            supplierQuoteHistoryId: null,
            paymentMethod: 'TRANSFER',
            incurredAt: new Date('2026-05-11T10:00:00.000Z'),
            notes: null,
            Supplier: null,
            InventoryItem: null,
            SupplierQuoteHistory: null,
          }),
        ),
      },
      workOrder: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            id: 'wo-1',
            number: 1001,
            type: WorkOrderType.WORKSHOP,
            status: WorkOrderStatus.IN_PROGRESS,
            paymentStatus: PaymentStatus.PENDING,
            customerId: 'customer-1',
            vehicleId: null,
            componentId: null,
            assignedEmployeeId: null,
            summary: 'Orden inventario',
            externalLink: null,
            notes: null,
            estimatedCompletionAt: null,
            estimatedCollectionAt: null,
            completedAt: null,
            createdAt: new Date('2026-05-10T08:00:00.000Z'),
            updatedAt: new Date('2026-05-11T10:00:00.000Z'),
            Customer: null,
            Vehicle: null,
            Component: null,
            Employee: null,
            WorkshopWorkOrderDetails: null,
            WorkOrderEstimate: [],
            WorkOrderActualCost: [],
            WorkOrderPayment: [],
            InventoryMovement: [
              {
                id: 'movement-1',
                inventoryItemId: 'item-1',
                movementType: 'OUT',
                reason: 'WORK_ORDER_CONSUMPTION',
                quantity: 2,
                unitCost: 180000,
                supplierId: 'supplier-1',
                workOrderId: 'wo-1',
                isReservedForWorkOrder: false,
                occurredAt: new Date('2026-05-11T10:00:00.000Z'),
                notes: 'Consumo final',
                createdAt: new Date('2026-05-11T10:00:00.000Z'),
                InventoryItem: {
                  id: 'item-1',
                  name: 'Inyector Bosch',
                  reference: '0445120231',
                  identifier: 'INV-1',
                  defaultSalePrice: 250000,
                  isActive: true,
                  itemType: 'STOCK_OWNED',
                },
              },
            ],
          }),
        ),
      },
    };

    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };

    const repository = new WorkOrdersRepository(prisma as never);

    await expect(
      repository.createInventoryAction('wo-1', {
        inventoryItemId: 'item-1',
        movementType: 'OUT',
        movementReason: 'WORK_ORDER_CONSUMPTION',
        quantity: 2,
        occurredAt: new Date('2026-05-11T10:00:00.000Z'),
        supplierId: 'supplier-1',
        unitCost: 180000,
        notes: 'Consumo final',
        actualCost: {
          category: 'DIRECT_PURCHASE',
          description: 'Consumo final',
          amount: 360000,
          paymentMethod: 'TRANSFER',
          incurredAt: new Date('2026-05-11T10:00:00.000Z'),
          supplierId: 'supplier-1',
          inventoryItemId: 'item-1',
        },
      }),
    ).resolves.toMatchObject({
      movement: { id: 'movement-1' },
      actualCost: { id: 'cost-1' },
      currentStockAfter: 3,
      workOrderInventory: [
        {
          inventoryItemId: 'item-1',
          consumedQuantity: 2,
        },
      ],
    });
  });

  it('rejects over-release and bubbles actual-cost failures so the transaction rolls back', async () => {
    const tx = {
      inventoryItem: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            id: 'item-1',
            name: 'Inyector Bosch',
            reference: '0445120231',
            identifier: 'INV-1',
            defaultSalePrice: 250000,
            isActive: true,
            itemType: 'STOCK_OWNED',
          }),
        ),
      },
      inventoryMovement: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'reserve-1',
              inventoryItemId: 'item-1',
              movementType: 'OUT',
              reason: 'WORK_ORDER_PURCHASE',
              quantity: 1,
              unitCost: null,
              supplierId: null,
              workOrderId: 'wo-1',
              isReservedForWorkOrder: true,
              occurredAt: new Date('2026-05-11T08:00:00.000Z'),
              notes: null,
              createdAt: new Date('2026-05-11T08:00:00.000Z'),
            },
          ])
          .mockResolvedValueOnce([
            {
              id: 'stock-in-1',
              inventoryItemId: 'item-1',
              movementType: 'IN',
              reason: 'PURCHASE',
              quantity: 3,
              unitCost: 180000,
              supplierId: 'supplier-1',
              workOrderId: null,
              isReservedForWorkOrder: false,
              occurredAt: new Date('2026-05-10T08:00:00.000Z'),
              notes: null,
              createdAt: new Date('2026-05-10T08:00:00.000Z'),
            },
          ]),
        create: jest.fn(() => Promise.resolve({ id: 'movement-1' })),
      },
      workOrderActualCost: {
        create: jest.fn(() =>
          Promise.reject(
            new BadRequestException('Actual cost amount must be greater than zero'),
          ),
        ),
      },
      workOrder: {
        findUnique: jest.fn(),
      },
    };

    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => Promise<unknown>) =>
        Promise.resolve(callback(tx)),
      ),
    };

    const repository = new WorkOrdersRepository(prisma as never);

    await repository
      .createInventoryAction('wo-1', {
        inventoryItemId: 'item-1',
        movementType: 'IN',
        movementReason: 'RETURN',
        quantity: 2,
        occurredAt: new Date('2026-05-11T10:00:00.000Z'),
      })
      .then(() => {
        throw new Error('expected release to fail');
      })
      .catch((error: unknown) => {
        expect(error).toEqual(
          new WorkOrderInventoryReservationConflictError(1, 2),
        );
      });

    await repository
      .createInventoryAction('wo-1', {
        inventoryItemId: 'item-1',
        movementType: 'OUT',
        movementReason: 'SALE',
        quantity: 1,
        occurredAt: new Date('2026-05-11T10:00:00.000Z'),
        actualCost: {
          category: 'DIRECT_PURCHASE',
          description: 'Venta mostrador',
          amount: 0,
          incurredAt: new Date('2026-05-11T10:00:00.000Z'),
          inventoryItemId: 'item-1',
        },
      })
      .then(() => {
        throw new Error('expected actual cost to fail');
      })
      .catch((error: unknown) => {
        expect(error).toEqual(
          new BadRequestException('Actual cost amount must be greater than zero'),
        );
      });
  });

  it('builds filters and pagination for work-order list search', async () => {
    type FindManyArgs = {
      where: Record<string, unknown>;
      orderBy: { number: 'desc' };
      skip: number;
      take: number;
      include: Record<string, unknown>;
    };
    type CountArgs = { where: Record<string, unknown> };

    let receivedFindManyArgs: FindManyArgs | undefined;
    let receivedCountArgs: CountArgs | undefined;

    const prisma = {
      workOrder: {
        findMany: jest.fn((args: FindManyArgs) => {
          receivedFindManyArgs = args;

          return Promise.resolve([]);
        }),
        count: jest.fn((args: CountArgs) => {
          receivedCountArgs = args;

          return Promise.resolve(0);
        }),
      },
    };

    const repository = new WorkOrdersRepository(prisma as never);

    await repository.findMany({
      page: 2,
      limit: 5,
      search: ' 1001 ',
      type: WorkOrderType.WORKSHOP,
      status: WorkOrderStatus.PAUSED,
      paymentStatus: PaymentStatus.PARTIAL,
      customerId: ' customer-1 ',
      vehicleId: ' vehicle-1 ',
      componentId: ' component-1 ',
      assignedEmployeeId: ' employee-1 ',
      estimatedCompletionFrom: new Date('2026-05-01T00:00:00.000Z'),
      estimatedCompletionTo: new Date('2026-05-31T23:59:59.000Z'),
      estimatedCollectionFrom: new Date('2026-05-02T00:00:00.000Z'),
      estimatedCollectionTo: new Date('2026-05-28T23:59:59.000Z'),
      completedFrom: new Date('2026-05-03T00:00:00.000Z'),
      completedTo: new Date('2026-05-29T23:59:59.000Z'),
    });

    expect(receivedFindManyArgs).toEqual({
      where: {
        type: WorkOrderType.WORKSHOP,
        status: WorkOrderStatus.PAUSED,
        paymentStatus: PaymentStatus.PARTIAL,
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
        componentId: 'component-1',
        assignedEmployeeId: 'employee-1',
        estimatedCompletionAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.000Z'),
        },
        estimatedCollectionAt: {
          gte: new Date('2026-05-02T00:00:00.000Z'),
          lte: new Date('2026-05-28T23:59:59.000Z'),
        },
        completedAt: {
          gte: new Date('2026-05-03T00:00:00.000Z'),
          lte: new Date('2026-05-29T23:59:59.000Z'),
        },
        OR: [
          { number: 1001 },
          { summary: { contains: '1001', mode: 'insensitive' } },
        ],
      },
      orderBy: { number: 'desc' },
      skip: 5,
      take: 5,
      include: expect.objectContaining({
        Customer: true,
        Vehicle: true,
        Component: true,
        Employee: true,
      }),
    });
    expect(receivedCountArgs).toEqual({
      where: receivedFindManyArgs?.where,
    });
  });

  it('reads and updates one work order with the detailed include graph', async () => {
    type FindUniqueArgs = {
      where: { id: string };
      include: Record<string, unknown>;
    };
    type UpdateArgs = {
      where: { id: string };
      data: Record<string, unknown>;
      include: Record<string, unknown>;
    };

    let receivedFindUniqueArgs: FindUniqueArgs | undefined;
    let receivedUpdateArgs: UpdateArgs | undefined;

    const prisma = {
      workOrder: {
        findUnique: jest.fn((args: FindUniqueArgs) => {
          receivedFindUniqueArgs = args;

          return Promise.resolve({
            id: 'wo-1',
            number: 1001,
            type: WorkOrderType.WORKSHOP,
            status: WorkOrderStatus.IN_PROGRESS,
            paymentStatus: PaymentStatus.PENDING,
            customerId: 'customer-1',
            vehicleId: 'vehicle-1',
            componentId: 'component-1',
            assignedEmployeeId: 'employee-1',
            summary: 'Reparación',
            externalLink: null,
            notes: null,
            estimatedCompletionAt: null,
            estimatedCollectionAt: null,
            completedAt: null,
            createdAt: new Date('2026-05-10T20:00:00.000Z'),
            updatedAt: new Date('2026-05-10T20:00:00.000Z'),
            Customer: {
              id: 'customer-1',
              name: 'Cliente Uno',
              phone: '3000000000',
              documentType: 'CEDULA',
              documentNumber: '123',
              email: null,
            },
            Vehicle: {
              id: 'vehicle-1',
              customerId: 'customer-1',
              brand: 'Mazda',
              modelReference: 'BT-50',
              plate: 'ABC123',
            },
            Component: {
              id: 'component-1',
              customerId: 'customer-1',
              vehicleId: 'vehicle-1',
              brand: 'Bosch',
              reference: 'ALT-90A',
              identifier: 'SER-100',
            },
            Employee: {
              id: 'employee-1',
              name: 'Mecánico Uno',
              type: 'MECHANIC',
              isActive: true,
            },
            WorkshopWorkOrderDetails: null,
            WorkOrderEstimate: [],
            WorkOrderActualCost: [],
            WorkOrderPayment: [],
          });
        }),
        update: jest.fn((args: UpdateArgs) => {
          receivedUpdateArgs = args;

          return Promise.resolve({
            id: 'wo-1',
            number: 1001,
            type: WorkOrderType.WORKSHOP,
            status: WorkOrderStatus.COMPLETED,
            paymentStatus: PaymentStatus.PENDING,
            customerId: 'customer-1',
            vehicleId: 'vehicle-1',
            componentId: 'component-1',
            assignedEmployeeId: 'employee-1',
            summary: 'Reparación terminada',
            externalLink: null,
            notes: null,
            estimatedCompletionAt: null,
            estimatedCollectionAt: null,
            completedAt: new Date('2026-05-12T18:00:00.000Z'),
            createdAt: new Date('2026-05-10T20:00:00.000Z'),
            updatedAt: new Date('2026-05-12T18:00:00.000Z'),
            Customer: {
              id: 'customer-1',
              name: 'Cliente Uno',
              phone: '3000000000',
              documentType: 'CEDULA',
              documentNumber: '123',
              email: null,
            },
            Vehicle: {
              id: 'vehicle-1',
              customerId: 'customer-1',
              brand: 'Mazda',
              modelReference: 'BT-50',
              plate: 'ABC123',
            },
            Component: {
              id: 'component-1',
              customerId: 'customer-1',
              vehicleId: 'vehicle-1',
              brand: 'Bosch',
              reference: 'ALT-90A',
              identifier: 'SER-100',
            },
            Employee: {
              id: 'employee-1',
              name: 'Mecánico Uno',
              type: 'MECHANIC',
              isActive: true,
            },
            WorkshopWorkOrderDetails: null,
            WorkOrderEstimate: [],
            WorkOrderActualCost: [],
            WorkOrderPayment: [],
          });
        }),
      },
    };

    const repository = new WorkOrdersRepository(prisma as never);

    await expect(repository.findById('wo-1')).resolves.toMatchObject({
      id: 'wo-1',
      customer: { id: 'customer-1' },
      vehicle: { id: 'vehicle-1' },
      component: { id: 'component-1' },
      assignedEmployee: { id: 'employee-1' },
    });
    await expect(
      repository.update('wo-1', {
        summary: ' Reparación terminada ',
        status: WorkOrderStatus.COMPLETED,
        completedAt: new Date('2026-05-12T18:00:00.000Z'),
      }),
    ).resolves.toMatchObject({
      id: 'wo-1',
      status: WorkOrderStatus.COMPLETED,
      summary: 'Reparación terminada',
    });

    expect(receivedFindUniqueArgs).toEqual({
      where: { id: 'wo-1' },
      include: expect.any(Object),
    });
    expect(receivedUpdateArgs?.data).toMatchObject({
      summary: 'Reparación terminada',
      status: WorkOrderStatus.COMPLETED,
      completedAt: new Date('2026-05-12T18:00:00.000Z'),
      updatedAt: expect.any(Date),
    });
  });

  it('updates workshop details exactly once for workshop orders and clears them for sale orders', async () => {
    type UpdateArgs = {
      where: { id: string };
      data: Record<string, unknown>;
      include: Record<string, unknown>;
    };
    type WorkshopDetailUpsertArgs = {
      where: { workOrderId: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    type WorkshopDetailDeleteManyArgs = {
      where: { workOrderId: string };
    };

    let receivedWorkshopDetailUpsertArgs: WorkshopDetailUpsertArgs | undefined;
    let receivedWorkshopDetailDeleteManyArgs:
      | WorkshopDetailDeleteManyArgs
      | undefined;

    const tx = {
      workOrder: {
        update: jest.fn((args: UpdateArgs) =>
          Promise.resolve({
            id: args.where.id,
            number: 1002,
            type: args.data.type ?? WorkOrderType.WORKSHOP,
            status: WorkOrderStatus.IN_PROGRESS,
            paymentStatus: PaymentStatus.PENDING,
            customerId: 'customer-1',
            vehicleId: 'vehicle-1',
            componentId: 'component-1',
            assignedEmployeeId: null,
            summary: 'Diagnóstico actualizado',
            externalLink: null,
            notes: null,
            estimatedCompletionAt: null,
            estimatedCollectionAt: null,
            completedAt: null,
            createdAt: new Date('2026-05-10T20:00:00.000Z'),
            updatedAt: new Date('2026-05-11T20:00:00.000Z'),
            Customer: {
              id: 'customer-1',
              name: 'Cliente Uno',
              phone: '3000000000',
              documentType: 'CEDULA',
              documentNumber: '123',
              email: 'cliente@example.com',
            },
            Vehicle: {
              id: 'vehicle-1',
              customerId: 'customer-1',
              brand: 'Mazda',
              modelReference: 'BT-50',
              plate: 'ABC123',
            },
            Component: {
              id: 'component-1',
              customerId: 'customer-1',
              vehicleId: 'vehicle-1',
              brand: 'Bosch',
              reference: 'ALT-90A',
              identifier: 'SER-100',
            },
            Employee: null,
            WorkshopWorkOrderDetails: null,
            WorkOrderEstimate: [],
            WorkOrderActualCost: [],
            WorkOrderPayment: [],
          }),
        ),
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'wo-workshop-1',
            number: 1002,
            type: WorkOrderType.WORKSHOP,
            status: WorkOrderStatus.IN_PROGRESS,
            paymentStatus: PaymentStatus.PENDING,
            customerId: 'customer-1',
            vehicleId: 'vehicle-1',
            componentId: 'component-1',
            assignedEmployeeId: null,
            summary: 'Diagnóstico actualizado',
            externalLink: null,
            notes: null,
            estimatedCompletionAt: null,
            estimatedCollectionAt: null,
            completedAt: null,
            createdAt: new Date('2026-05-10T20:00:00.000Z'),
            updatedAt: new Date('2026-05-11T20:00:00.000Z'),
            Customer: {
              id: 'customer-1',
              name: 'Cliente Uno',
              phone: '3000000000',
              documentType: 'CEDULA',
              documentNumber: '123',
              email: 'cliente@example.com',
            },
            Vehicle: {
              id: 'vehicle-1',
              customerId: 'customer-1',
              brand: 'Mazda',
              modelReference: 'BT-50',
              plate: 'ABC123',
            },
            Component: {
              id: 'component-1',
              customerId: 'customer-1',
              vehicleId: 'vehicle-1',
              brand: 'Bosch',
              reference: 'ALT-90A',
              identifier: 'SER-100',
            },
            Employee: null,
            WorkshopWorkOrderDetails: {
              id: 'workshop-detail-1',
              customerReportedIssue: 'No enciende',
              diagnosisRequired: false,
              diagnosisSummary: 'Alternador revisado',
            },
            WorkOrderEstimate: [],
            WorkOrderActualCost: [],
            WorkOrderPayment: [],
          })
          .mockResolvedValueOnce({
            id: 'wo-sale-1',
            number: 1003,
            type: WorkOrderType.SALE,
            status: WorkOrderStatus.IN_PROGRESS,
            paymentStatus: PaymentStatus.PENDING,
            customerId: 'customer-1',
            vehicleId: null,
            componentId: null,
            assignedEmployeeId: null,
            summary: 'Venta de repuesto',
            externalLink: null,
            notes: null,
            estimatedCompletionAt: null,
            estimatedCollectionAt: null,
            completedAt: null,
            createdAt: new Date('2026-05-10T20:00:00.000Z'),
            updatedAt: new Date('2026-05-11T20:00:00.000Z'),
            Customer: {
              id: 'customer-1',
              name: 'Cliente Uno',
              phone: '3000000000',
              documentType: 'CEDULA',
              documentNumber: '123',
              email: 'cliente@example.com',
            },
            Vehicle: null,
            Component: null,
            Employee: null,
            WorkshopWorkOrderDetails: null,
            WorkOrderEstimate: [],
            WorkOrderActualCost: [],
            WorkOrderPayment: [],
          }),
      },
      workshopWorkOrderDetails: {
        upsert: jest.fn((args: WorkshopDetailUpsertArgs) => {
          receivedWorkshopDetailUpsertArgs = args;
          return Promise.resolve({
            id: 'workshop-detail-1',
            workOrderId: 'wo-workshop-1',
            customerReportedIssue: 'No enciende',
            diagnosisRequired: false,
            diagnosisSummary: 'Alternador revisado',
          });
        }),
        deleteMany: jest.fn((args: WorkshopDetailDeleteManyArgs) => {
          receivedWorkshopDetailDeleteManyArgs = args;
          return Promise.resolve({ count: 1 });
        }),
      },
    };

    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };

    const repository = new WorkOrdersRepository(prisma as never);

    await expect(
      repository.update(
        'wo-workshop-1',
        {
          summary: ' Diagnóstico actualizado ',
          customerReportedIssue: ' No enciende ',
          diagnosisRequired: false,
          diagnosisSummary: ' Alternador revisado ',
        },
        WorkOrderType.WORKSHOP,
      ),
    ).resolves.toMatchObject({
      id: 'wo-workshop-1',
      workshopDetails: {
        id: 'workshop-detail-1',
        diagnosisRequired: false,
        diagnosisSummary: 'Alternador revisado',
      },
    });

    await expect(
      repository.update('wo-sale-1', {
        type: WorkOrderType.SALE,
        customerReportedIssue: ' No debería persistir ',
        diagnosisRequired: true,
        diagnosisSummary: ' Ignorar para venta ',
      }),
    ).resolves.toMatchObject({
      id: 'wo-sale-1',
      type: WorkOrderType.SALE,
      workshopDetails: null,
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(receivedWorkshopDetailUpsertArgs).toMatchObject({
      where: { workOrderId: 'wo-workshop-1' },
      create: {
        id: expect.any(String),
        workOrderId: 'wo-workshop-1',
        customerReportedIssue: 'No enciende',
        diagnosisRequired: false,
        diagnosisSummary: 'Alternador revisado',
      },
      update: {
        customerReportedIssue: 'No enciende',
        diagnosisRequired: false,
        diagnosisSummary: 'Alternador revisado',
      },
    });
    expect(receivedWorkshopDetailDeleteManyArgs).toEqual({
      where: { workOrderId: 'wo-sale-1' },
    });
  });
  it('upserts INITIAL estimates transactionally by replacing previous lines with the submitted set', async () => {
    type UpsertArgs = {
      where: {
        workOrderId_phase: { workOrderId: string; phase: EstimatePhase };
      };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    type DeleteManyArgs = { where: { estimateId: string } };
    type CreateManyArgs = { data: Record<string, unknown>[] };

    let receivedUpsertArgs: UpsertArgs | undefined;
    let receivedDeleteManyArgs: DeleteManyArgs | undefined;
    let receivedCreateManyArgs: CreateManyArgs | undefined;

    const tx = {
      workOrderEstimate: {
        upsert: jest.fn((args: UpsertArgs) => {
          receivedUpsertArgs = args;

          return Promise.resolve({ id: 'estimate-initial' });
        }),
        findUnique: jest.fn(() =>
          Promise.resolve({
            id: 'estimate-initial',
            workOrderId: 'wo-1',
            phase: EstimatePhase.INITIAL,
            estimatedLaborHours: { toNumber: () => 1.5 },
            laborHourlyCostSnapshot: null,
            baseCostAmount: 120000,
            contingencyPct: 10,
            contingencyAmount: 30000,
            totalCostAmount: 150000,
            totalPriceAmount: 220000,
            recommendedMinimumPrice: null,
            recommendedPrice: null,
            recommendedHighPrice: null,
            notes: 'Estimación inicial',
            createdAt: new Date('2026-05-10T20:00:00.000Z'),
            updatedAt: new Date('2026-05-10T20:05:00.000Z'),
            WorkOrderEstimateLine: [
              {
                id: 'line-new-1',
                lineType: EstimateLineType.PART,
                description: 'Rodamiento delantero',
                inventoryItemId: 'inventory-1',
                serviceCatalogId: null,
                supplierId: 'supplier-1',
                supplierQuoteHistoryId: 'quote-1',
                quantity: 2,
                unitCost: 60000,
                unitPrice: 95000,
                notes: 'Incluye garantía',
                createdAt: new Date('2026-05-10T20:00:00.000Z'),
                updatedAt: new Date('2026-05-10T20:05:00.000Z'),
                InventoryItem: {
                  id: 'inventory-1',
                  name: 'Rodamiento delantero',
                  reference: 'ROD-01',
                  identifier: 'INV-01',
                  defaultSalePrice: 95000,
                  isActive: true,
                },
                ServiceCatalog: null,
                Supplier: {
                  id: 'supplier-1',
                  name: 'Proveedor Uno',
                  type: 'COMPANY',
                  isActive: true,
                },
                SupplierQuoteHistory: {
                  id: 'quote-1',
                  supplierId: 'supplier-1',
                  inventoryItemId: 'inventory-1',
                  workOrderId: 'wo-1',
                  quotedCost: 60000,
                  quotedAt: new Date('2026-05-10T19:00:00.000Z'),
                  status: SupplierQuoteStatus.ACTIVE,
                  Supplier: {
                    id: 'supplier-1',
                    name: 'Proveedor Uno',
                    type: 'COMPANY',
                    isActive: true,
                  },
                  InventoryItem: {
                    id: 'inventory-1',
                    name: 'Rodamiento delantero',
                    reference: 'ROD-01',
                    identifier: 'INV-01',
                    defaultSalePrice: 95000,
                    isActive: true,
                  },
                },
              },
            ],
          }),
        ),
      },
      workOrderEstimateLine: {
        deleteMany: jest.fn((args: DeleteManyArgs) => {
          receivedDeleteManyArgs = args;

          return Promise.resolve({ count: 2 });
        }),
        createMany: jest.fn((args: CreateManyArgs) => {
          receivedCreateManyArgs = args;

          return Promise.resolve({ count: 1 });
        }),
      },
    };

    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };

    const repository = new WorkOrdersRepository(prisma as never);

    await expect(
      repository.upsertEstimate('wo-1', EstimatePhase.INITIAL, {
        estimatedLaborHours: 1.5,
        laborHourlyCostSnapshot: 50000,
        baseCostAmount: 120000,
        contingencyPct: 10,
        totalCostAmount: 150000,
        recommendedMinimumPrice: 180000,
        recommendedPrice: 220000,
        recommendedHighPrice: 260000,
        totalPriceAmount: 220000,
        notes: ' Estimación inicial ',
        lines: [
          {
            lineType: EstimateLineType.PART,
            description: ' Rodamiento delantero ',
            inventoryItemId: ' inventory-1 ',
            supplierId: ' supplier-1 ',
            supplierQuoteHistoryId: ' quote-1 ',
            quantity: 2,
            unitCost: 60000,
            unitPrice: 95000,
            notes: ' Incluye garantía ',
          },
        ],
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'estimate-initial',
        phase: EstimatePhase.INITIAL,
        estimatedLaborHours: 1.5,
        lines: [
          expect.objectContaining({
            id: 'line-new-1',
            description: 'Rodamiento delantero',
            inventoryItem: expect.objectContaining({ id: 'inventory-1' }),
            supplier: expect.objectContaining({ id: 'supplier-1' }),
            supplierQuoteHistory: expect.objectContaining({
              id: 'quote-1',
              supplier: expect.objectContaining({ id: 'supplier-1' }),
              inventoryItem: expect.objectContaining({ id: 'inventory-1' }),
            }),
          }),
        ],
      }),
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(receivedUpsertArgs).toMatchObject({
      where: {
        workOrderId_phase: {
          workOrderId: 'wo-1',
          phase: EstimatePhase.INITIAL,
        },
      },
      create: {
        id: expect.any(String),
        workOrderId: 'wo-1',
        phase: EstimatePhase.INITIAL,
        estimatedLaborHours: 1.5,
        laborHourlyCostSnapshot: 50000,
        baseCostAmount: 120000,
        contingencyPct: 10,
        contingencyAmount: 30000,
        totalCostAmount: 150000,
        totalPriceAmount: 220000,
        recommendedMinimumPrice: 180000,
        recommendedPrice: 220000,
        recommendedHighPrice: 260000,
        notes: 'Estimación inicial',
      },
    });
    expect(receivedDeleteManyArgs).toEqual({
      where: { estimateId: 'estimate-initial' },
    });
    expect(receivedCreateManyArgs?.data).toEqual([
      expect.objectContaining({
        id: expect.any(String),
        estimateId: 'estimate-initial',
        lineType: EstimateLineType.PART,
        description: 'Rodamiento delantero',
        inventoryItemId: 'inventory-1',
        supplierId: 'supplier-1',
        supplierQuoteHistoryId: 'quote-1',
        quantity: 2,
        unitCost: 60000,
        unitPrice: 95000,
        notes: 'Incluye garantía',
      }),
    ]);
  });

  it('upserts FINAL estimates transactionally and clears previous lines when the new set is empty', async () => {
    const tx = {
      workOrderEstimate: {
        upsert: jest.fn(() => Promise.resolve({ id: 'estimate-final' })),
        findUnique: jest.fn(() =>
          Promise.resolve({
            id: 'estimate-final',
            workOrderId: 'wo-1',
            phase: EstimatePhase.FINAL,
            estimatedLaborHours: { toNumber: () => 2 },
            laborHourlyCostSnapshot: null,
            baseCostAmount: 180000,
            contingencyPct: null,
            contingencyAmount: 0,
            totalCostAmount: 180000,
            totalPriceAmount: 260000,
            recommendedMinimumPrice: null,
            recommendedPrice: null,
            recommendedHighPrice: null,
            notes: 'Cierre',
            createdAt: new Date('2026-05-10T20:00:00.000Z'),
            updatedAt: new Date('2026-05-10T20:05:00.000Z'),
            WorkOrderEstimateLine: [],
          }),
        ),
      },
      workOrderEstimateLine: {
        deleteMany: jest.fn(() => Promise.resolve({ count: 3 })),
        createMany: jest.fn(() => Promise.resolve({ count: 0 })),
      },
    };

    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };

    const repository = new WorkOrdersRepository(prisma as never);

    await expect(
      repository.upsertEstimate('wo-1', EstimatePhase.FINAL, {
        estimatedLaborHours: 2,
        baseCostAmount: 180000,
        totalCostAmount: 180000,
        totalPriceAmount: 260000,
        notes: ' Cierre ',
        lines: [],
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        phase: EstimatePhase.FINAL,
        lines: [],
      }),
    );

    expect(tx.workOrderEstimateLine.deleteMany).toHaveBeenCalledWith({
      where: { estimateId: 'estimate-final' },
    });
    expect(tx.workOrderEstimateLine.createMany).not.toHaveBeenCalled();
  });

  it('creates, lists, updates, and deletes actual costs without deleting the parent work order', async () => {
    type ActualCostCreateArgs = {
      data: Record<string, unknown>;
      include: Record<string, unknown>;
    };
    type ActualCostFindManyArgs = {
      where: { workOrderId: string };
      orderBy: { incurredAt: 'desc' };
      include: Record<string, unknown>;
    };
    type ActualCostFindFirstArgs = {
      where: { id: string; workOrderId: string };
      include: Record<string, unknown>;
    };
    type ActualCostUpdateArgs = {
      where: { id: string };
      data: Record<string, unknown>;
      include: Record<string, unknown>;
    };
    type ActualCostDeleteArgs = {
      where: { id: string };
    };

    let receivedCreateArgs: ActualCostCreateArgs | undefined;
    let receivedFindManyArgs: ActualCostFindManyArgs | undefined;
    let receivedUpdateArgs: ActualCostUpdateArgs | undefined;
    let receivedDeleteArgs: ActualCostDeleteArgs | undefined;

    const actualCostRecord = {
      id: 'cost-1',
      category: WorkOrderCostCategory.DIRECT_PURCHASE,
      description: 'Rodamiento SKF',
      amount: 150000,
      supplierId: 'supplier-1',
      inventoryItemId: 'inventory-1',
      supplierQuoteHistoryId: 'quote-1',
      paymentMethod: PaymentMethod.TRANSFER,
      incurredAt: new Date('2026-05-10T18:00:00.000Z'),
      notes: 'Compra urgente',
      Supplier: {
        id: 'supplier-1',
        name: 'Proveedor Uno',
        type: 'COMPANY',
        isActive: true,
      },
      InventoryItem: {
        id: 'inventory-1',
        name: 'Rodamiento SKF',
        reference: 'SKF-6203',
        identifier: 'INV-6203',
        defaultSalePrice: 180000,
        isActive: true,
      },
      SupplierQuoteHistory: {
        id: 'quote-1',
        supplierId: 'supplier-1',
        inventoryItemId: 'inventory-1',
        workOrderId: null,
        quotedCost: 145000,
        quotedAt: new Date('2026-05-09T15:00:00.000Z'),
        status: SupplierQuoteStatus.ACTIVE,
        Supplier: {
          id: 'supplier-1',
          name: 'Proveedor Uno',
          type: 'COMPANY',
          isActive: true,
        },
        InventoryItem: {
          id: 'inventory-1',
          name: 'Rodamiento SKF',
          reference: 'SKF-6203',
          identifier: 'INV-6203',
          defaultSalePrice: 180000,
          isActive: true,
        },
      },
    };

    const prisma = {
      workOrder: {
        findUnique: jest.fn().mockResolvedValue({ id: 'wo-1' }),
        delete: jest.fn(),
      },
      workOrderActualCost: {
        create: jest.fn((args: ActualCostCreateArgs) => {
          receivedCreateArgs = args;
          return Promise.resolve(actualCostRecord);
        }),
        findMany: jest.fn((args: ActualCostFindManyArgs) => {
          receivedFindManyArgs = args;
          return Promise.resolve([actualCostRecord]);
        }),
        findFirst: jest.fn((args: ActualCostFindFirstArgs) =>
          Promise.resolve(
            args.where.id === 'cost-1' && args.where.workOrderId === 'wo-1'
              ? actualCostRecord
              : null,
          ),
        ),
        update: jest.fn((args: ActualCostUpdateArgs) => {
          receivedUpdateArgs = args;
          return Promise.resolve({
            ...actualCostRecord,
            description: 'Rodamiento SKF 6203',
            notes: null,
          });
        }),
        delete: jest.fn((args: ActualCostDeleteArgs) => {
          receivedDeleteArgs = args;
          return Promise.resolve(actualCostRecord);
        }),
      },
    };

    const repository = new WorkOrdersRepository(prisma as never);

    await expect(
      repository.createActualCost('wo-1', {
        category: WorkOrderCostCategory.DIRECT_PURCHASE,
        description: ' Rodamiento SKF ',
        amount: 150000,
        supplierId: ' supplier-1 ',
        inventoryItemId: ' inventory-1 ',
        supplierQuoteHistoryId: ' quote-1 ',
        paymentMethod: PaymentMethod.TRANSFER,
        incurredAt: new Date('2026-05-10T18:00:00.000Z'),
        notes: ' Compra urgente ',
      }),
    ).resolves.toMatchObject({
      id: 'cost-1',
      supplier: { id: 'supplier-1', name: 'Proveedor Uno' },
      inventoryItem: { id: 'inventory-1', sku: 'SKF-6203' },
      supplierQuoteHistory: { id: 'quote-1' },
    });

    await expect(repository.findActualCosts('wo-1')).resolves.toEqual([
      expect.objectContaining({
        id: 'cost-1',
        category: WorkOrderCostCategory.DIRECT_PURCHASE,
      }),
    ]);

    await expect(
      repository.updateActualCost('wo-1', 'cost-1', {
        description: ' Rodamiento SKF 6203 ',
        notes: ' ',
      }),
    ).resolves.toMatchObject({
      id: 'cost-1',
      description: 'Rodamiento SKF 6203',
      notes: null,
    });

    await expect(
      repository.removeActualCost('wo-1', 'cost-1'),
    ).resolves.toBeUndefined();

    expect(receivedCreateArgs).toMatchObject({
      data: {
        id: expect.any(String),
        workOrderId: 'wo-1',
        category: WorkOrderCostCategory.DIRECT_PURCHASE,
        description: 'Rodamiento SKF',
        supplierId: 'supplier-1',
        inventoryItemId: 'inventory-1',
        supplierQuoteHistoryId: 'quote-1',
        notes: 'Compra urgente',
        updatedAt: expect.any(Date),
      },
    });
    expect(receivedFindManyArgs).toEqual({
      where: { workOrderId: 'wo-1' },
      orderBy: { incurredAt: 'desc' },
      include: expect.any(Object),
    });
    expect(receivedUpdateArgs?.data).toMatchObject({
      description: 'Rodamiento SKF 6203',
      notes: null,
      updatedAt: expect.any(Date),
    });
    expect(receivedDeleteArgs).toEqual({ where: { id: 'cost-1' } });
    expect(prisma.workOrder.delete).not.toHaveBeenCalled();
  });

  it('creates a payment and derives PARTIAL from the FINAL estimate total before INITIAL', async () => {
    type PaymentCreateArgs = { data: Record<string, unknown> };
    type WorkOrderUpdateArgs = {
      where: { id: string };
      data: Record<string, unknown>;
      include: Record<string, unknown>;
    };

    let receivedPaymentCreateArgs: PaymentCreateArgs | undefined;
    let receivedWorkOrderUpdateArgs: WorkOrderUpdateArgs | undefined;

    const tx = {
      workOrderPayment: {
        create: jest.fn((args: PaymentCreateArgs) => {
          receivedPaymentCreateArgs = args;
          return Promise.resolve({ id: 'payment-1' });
        }),
      },
      workOrder: {
        update: jest.fn((args: WorkOrderUpdateArgs) => {
          receivedWorkOrderUpdateArgs = args;

          return Promise.resolve(
            buildWorkOrderRecord({
              paymentStatus: PaymentStatus.PARTIAL,
              WorkOrderEstimate: [
                buildEstimateRecord('estimate-initial-1', 'INITIAL', 70000),
                buildEstimateRecord('estimate-final-1', 'FINAL', 100000),
              ],
              WorkOrderPayment: [buildPaymentRecord('payment-1', 50000)],
            }),
          );
        }),
      },
    };

    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };

    const repository = new WorkOrdersRepository(prisma as never);

    await expect(
      repository.createPayment(
        'wo-1',
        {
          amount: 50000,
          paidAt: new Date('2026-05-10T20:00:00.000Z'),
          paymentMethod: 'CASH',
          notes: ' Abono inicial ',
        },
        buildWorkOrderDetail({
          paymentStatus: PaymentStatus.PENDING,
          estimates: [
            buildEstimateSummary('estimate-initial-1', 'INITIAL', 70000),
            buildEstimateSummary('estimate-final-1', 'FINAL', 100000),
          ],
          payments: [],
        }),
      ),
    ).resolves.toMatchObject({
      id: 'wo-1',
      paymentStatus: PaymentStatus.PARTIAL,
      payments: [{ id: 'payment-1', amount: 50000 }],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(receivedPaymentCreateArgs).toMatchObject({
      data: {
        id: expect.any(String),
        workOrderId: 'wo-1',
        amount: 50000,
        paymentMethod: 'CASH',
        paidAt: new Date('2026-05-10T20:00:00.000Z'),
        notes: 'Abono inicial',
        updatedAt: expect.any(Date),
      },
    });
    expect(receivedWorkOrderUpdateArgs?.data).toMatchObject({
      paymentStatus: PaymentStatus.PARTIAL,
      updatedAt: expect.any(Date),
    });
  });

  it('updates a payment and derives PAID from INITIAL when FINAL is absent', async () => {
    type PaymentUpdateArgs = {
      where: { id: string };
      data: Record<string, unknown>;
    };
    type WorkOrderUpdateArgs = {
      where: { id: string };
      data: Record<string, unknown>;
      include: Record<string, unknown>;
    };

    let receivedPaymentUpdateArgs: PaymentUpdateArgs | undefined;
    let receivedWorkOrderUpdateArgs: WorkOrderUpdateArgs | undefined;

    const tx = {
      workOrderPayment: {
        update: jest.fn((args: PaymentUpdateArgs) => {
          receivedPaymentUpdateArgs = args;
          return Promise.resolve({ id: 'payment-1' });
        }),
      },
      workOrder: {
        update: jest.fn((args: WorkOrderUpdateArgs) => {
          receivedWorkOrderUpdateArgs = args;

          return Promise.resolve(
            buildWorkOrderRecord({
              paymentStatus: PaymentStatus.PAID,
              WorkOrderEstimate: [
                buildEstimateRecord('estimate-initial-1', 'INITIAL', 100000),
              ],
              WorkOrderPayment: [
                buildPaymentRecord('payment-1', 100000, 'TRANSFER'),
              ],
            }),
          );
        }),
      },
    };

    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };

    const repository = new WorkOrdersRepository(prisma as never);

    await expect(
      repository.updatePayment(
        'wo-1',
        'payment-1',
        {
          amount: 100000,
          paymentMethod: 'TRANSFER',
        },
        buildWorkOrderDetail({
          paymentStatus: PaymentStatus.PARTIAL,
          estimates: [
            buildEstimateSummary('estimate-initial-1', 'INITIAL', 100000),
          ],
          payments: [buildPaymentSummary('payment-1', 50000)],
        }),
      ),
    ).resolves.toMatchObject({
      id: 'wo-1',
      paymentStatus: PaymentStatus.PAID,
      payments: [
        { id: 'payment-1', amount: 100000, paymentMethod: 'TRANSFER' },
      ],
    });

    expect(receivedPaymentUpdateArgs).toMatchObject({
      where: { id: 'payment-1' },
      data: {
        amount: 100000,
        paymentMethod: 'TRANSFER',
        updatedAt: expect.any(Date),
      },
    });
    expect(receivedWorkOrderUpdateArgs?.data).toMatchObject({
      paymentStatus: PaymentStatus.PAID,
      updatedAt: expect.any(Date),
    });
  });

  it('removes a payment and derives PENDING when totals remain payable', async () => {
    type PaymentDeleteArgs = { where: { id: string } };
    type WorkOrderUpdateArgs = {
      where: { id: string };
      data: Record<string, unknown>;
      include: Record<string, unknown>;
    };

    let receivedPaymentDeleteArgs: PaymentDeleteArgs | undefined;
    let receivedWorkOrderUpdateArgs: WorkOrderUpdateArgs | undefined;

    const tx = {
      workOrderPayment: {
        delete: jest.fn((args: PaymentDeleteArgs) => {
          receivedPaymentDeleteArgs = args;
          return Promise.resolve({ id: 'payment-1' });
        }),
      },
      workOrder: {
        update: jest.fn((args: WorkOrderUpdateArgs) => {
          receivedWorkOrderUpdateArgs = args;

          return Promise.resolve(
            buildWorkOrderRecord({
              paymentStatus: PaymentStatus.PENDING,
              WorkOrderEstimate: [
                buildEstimateRecord('estimate-final-1', 'FINAL', 100000),
              ],
              WorkOrderPayment: [],
            }),
          );
        }),
      },
    };

    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };

    const repository = new WorkOrdersRepository(prisma as never);

    await expect(
      repository.removePayment(
        'wo-1',
        'payment-1',
        buildWorkOrderDetail({
          paymentStatus: PaymentStatus.PARTIAL,
          estimates: [
            buildEstimateSummary('estimate-final-1', 'FINAL', 100000),
          ],
          payments: [buildPaymentSummary('payment-1', 50000)],
        }),
      ),
    ).resolves.toMatchObject({
      id: 'wo-1',
      paymentStatus: PaymentStatus.PENDING,
      payments: [],
    });

    expect(receivedPaymentDeleteArgs).toEqual({ where: { id: 'payment-1' } });
    expect(receivedWorkOrderUpdateArgs?.data).toMatchObject({
      paymentStatus: PaymentStatus.PENDING,
      updatedAt: expect.any(Date),
    });
  });

  it('keeps the manual payment status when no estimate total exists', async () => {
    type PaymentCreateArgs = { data: Record<string, unknown> };
    type WorkOrderUpdateArgs = {
      where: { id: string };
      data: Record<string, unknown>;
      include: Record<string, unknown>;
    };

    let receivedPaymentCreateArgs: PaymentCreateArgs | undefined;
    let receivedWorkOrderUpdateArgs: WorkOrderUpdateArgs | undefined;

    const tx = {
      workOrderPayment: {
        create: jest.fn((args: PaymentCreateArgs) => {
          receivedPaymentCreateArgs = args;
          return Promise.resolve({ id: 'payment-2' });
        }),
      },
      workOrder: {
        update: jest.fn((args: WorkOrderUpdateArgs) => {
          receivedWorkOrderUpdateArgs = args;

          return Promise.resolve(
            buildWorkOrderRecord({
              paymentStatus: PaymentStatus.PAID,
              WorkOrderEstimate: [],
              WorkOrderPayment: [
                buildPaymentRecord('payment-2', 15000, 'CARD'),
              ],
            }),
          );
        }),
      },
    };

    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };

    const repository = new WorkOrdersRepository(prisma as never);

    await expect(
      repository.createPayment(
        'wo-1',
        {
          amount: 15000,
          paidAt: new Date('2026-05-11T10:00:00.000Z'),
          paymentMethod: 'CARD',
        },
        buildWorkOrderDetail({
          paymentStatus: PaymentStatus.PAID,
          estimates: [],
          payments: [],
        }),
      ),
    ).resolves.toMatchObject({
      id: 'wo-1',
      paymentStatus: PaymentStatus.PAID,
      payments: [{ id: 'payment-2', amount: 15000, paymentMethod: 'CARD' }],
    });

    expect(receivedPaymentCreateArgs?.data).toMatchObject({
      workOrderId: 'wo-1',
      amount: 15000,
      paymentMethod: 'CARD',
    });
    expect(receivedWorkOrderUpdateArgs?.data).toMatchObject({
      paymentStatus: PaymentStatus.PAID,
      updatedAt: expect.any(Date),
    });
  });
});

function buildWorkOrderDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wo-1',
    number: 1001,
    type: WorkOrderType.WORKSHOP,
    status: WorkOrderStatus.IN_PROGRESS,
    paymentStatus: PaymentStatus.PENDING,
    customerId: 'customer-1',
    vehicleId: null,
    componentId: null,
    assignedEmployeeId: null,
    summary: 'Diagnóstico',
    externalLink: null,
    notes: null,
    estimatedCompletionAt: null,
    estimatedCollectionAt: null,
    completedAt: null,
    createdAt: new Date('2026-05-10T20:00:00.000Z'),
    updatedAt: new Date('2026-05-10T20:00:00.000Z'),
    customer: { id: 'customer-1', name: 'Cliente Uno' },
    vehicle: null,
    component: null,
    assignedEmployee: null,
    workshopDetails: null,
    estimates: [],
    actualCosts: [],
    payments: [],
    ...overrides,
  };
}

function buildWorkOrderRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wo-1',
    number: 1001,
    type: WorkOrderType.WORKSHOP,
    status: WorkOrderStatus.IN_PROGRESS,
    paymentStatus: PaymentStatus.PENDING,
    customerId: 'customer-1',
    vehicleId: null,
    componentId: null,
    assignedEmployeeId: null,
    summary: 'Diagnóstico',
    externalLink: null,
    notes: null,
    estimatedCompletionAt: null,
    estimatedCollectionAt: null,
    completedAt: null,
    createdAt: new Date('2026-05-10T20:00:00.000Z'),
    updatedAt: new Date('2026-05-10T20:00:00.000Z'),
    Customer: {
      id: 'customer-1',
      name: 'Cliente Uno',
      phone: '3000000000',
      documentType: 'CEDULA',
      documentNumber: '123',
      email: null,
    },
    Vehicle: null,
    Component: null,
    Employee: null,
    WorkshopWorkOrderDetails: null,
    WorkOrderEstimate: [],
    WorkOrderActualCost: [],
    WorkOrderPayment: [],
    ...overrides,
  };
}

function buildEstimateSummary(
  id: string,
  phase: string,
  totalPriceAmount: number,
) {
  return {
    id,
    phase,
    totalCostAmount: totalPriceAmount,
    totalPriceAmount,
    notes: null,
  };
}

function buildEstimateRecord(
  id: string,
  phase: string,
  totalPriceAmount: number,
) {
  return {
    id,
    phase,
    totalCostAmount: totalPriceAmount,
    totalPriceAmount,
    notes: null,
  };
}

function buildPaymentSummary(id: string, amount: number) {
  return {
    id,
    amount,
    paymentMethod: 'CASH',
    paidAt: new Date('2026-05-10T20:00:00.000Z'),
    notes: null,
  };
}

function buildPaymentRecord(
  id: string,
  amount: number,
  paymentMethod = 'CASH',
) {
  return {
    id,
    amount,
    paymentMethod,
    paidAt: new Date('2026-05-10T20:00:00.000Z'),
    notes: null,
  };
}
