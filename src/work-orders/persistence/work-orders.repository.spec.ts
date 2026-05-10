import { PaymentStatus, WorkOrderStatus, WorkOrderType } from '../../../generated/prisma/enums';
import { WorkOrdersRepository } from './work-orders.repository';

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
      $transaction: jest.fn(async (callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
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
            Customer: { id: 'customer-1', name: 'Cliente Uno', phone: '3000000000', documentType: 'CEDULA', documentNumber: '123', email: null },
            Vehicle: { id: 'vehicle-1', customerId: 'customer-1', brand: 'Mazda', modelReference: 'BT-50', plate: 'ABC123' },
            Component: { id: 'component-1', customerId: 'customer-1', vehicleId: 'vehicle-1', brand: 'Bosch', reference: 'ALT-90A', identifier: 'SER-100' },
            Employee: { id: 'employee-1', name: 'Mecánico Uno', type: 'MECHANIC', isActive: true },
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
            Customer: { id: 'customer-1', name: 'Cliente Uno', phone: '3000000000', documentType: 'CEDULA', documentNumber: '123', email: null },
            Vehicle: { id: 'vehicle-1', customerId: 'customer-1', brand: 'Mazda', modelReference: 'BT-50', plate: 'ABC123' },
            Component: { id: 'component-1', customerId: 'customer-1', vehicleId: 'vehicle-1', brand: 'Bosch', reference: 'ALT-90A', identifier: 'SER-100' },
            Employee: { id: 'employee-1', name: 'Mecánico Uno', type: 'MECHANIC', isActive: true },
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
    let receivedWorkshopDetailDeleteManyArgs: WorkshopDetailDeleteManyArgs | undefined;

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
            Customer: { id: 'customer-1', name: 'Cliente Uno', phone: '3000000000', documentType: 'CEDULA', documentNumber: '123', email: 'cliente@example.com' },
            Vehicle: { id: 'vehicle-1', customerId: 'customer-1', brand: 'Mazda', modelReference: 'BT-50', plate: 'ABC123' },
            Component: { id: 'component-1', customerId: 'customer-1', vehicleId: 'vehicle-1', brand: 'Bosch', reference: 'ALT-90A', identifier: 'SER-100' },
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
            Customer: { id: 'customer-1', name: 'Cliente Uno', phone: '3000000000', documentType: 'CEDULA', documentNumber: '123', email: 'cliente@example.com' },
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
      $transaction: jest.fn(async (callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };

    const repository = new WorkOrdersRepository(prisma as never);

    await expect(
      repository.update('wo-workshop-1', {
        summary: ' Diagnóstico actualizado ',
        customerReportedIssue: ' No enciende ',
        diagnosisRequired: false,
        diagnosisSummary: ' Alternador revisado ',
      }, WorkOrderType.WORKSHOP),
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
});
