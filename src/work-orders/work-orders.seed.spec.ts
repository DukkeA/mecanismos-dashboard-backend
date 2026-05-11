import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Prisma } from '../../generated/prisma/client';
import {
  type WorkOrderSeedPrismaTransactionClient,
  type WorkOrderSeedPrismaClient,
  seedWorkOrders,
} from '../../prisma/seed-work-orders';

type WorkOrderUpsertArgs = Prisma.WorkOrderUpsertArgs;
type WorkshopWorkOrderDetailsDeleteManyArgs =
  Prisma.WorkshopWorkOrderDetailsDeleteManyArgs;
type WorkshopWorkOrderDetailsCreateManyArgs =
  Prisma.WorkshopWorkOrderDetailsCreateManyArgs;
type WorkOrderEstimateUpsertArgs = Prisma.WorkOrderEstimateUpsertArgs;
type WorkOrderEstimateLineDeleteManyArgs =
  Prisma.WorkOrderEstimateLineDeleteManyArgs;
type WorkOrderEstimateLineCreateManyArgs =
  Prisma.WorkOrderEstimateLineCreateManyArgs;
type WorkOrderActualCostDeleteManyArgs =
  Prisma.WorkOrderActualCostDeleteManyArgs;
type WorkOrderActualCostCreateManyArgs =
  Prisma.WorkOrderActualCostCreateManyArgs;
type WorkOrderPaymentDeleteManyArgs = Prisma.WorkOrderPaymentDeleteManyArgs;
type WorkOrderPaymentCreateManyArgs = Prisma.WorkOrderPaymentCreateManyArgs;
type InventoryMovementUpdateManyArgs = Prisma.InventoryMovementUpdateManyArgs;
type InventoryMovementDeleteManyArgs = Prisma.InventoryMovementDeleteManyArgs;
type InventoryMovementCreateManyArgs = Prisma.InventoryMovementCreateManyArgs;
type SupplierQuoteHistoryUpdateManyArgs =
  Prisma.SupplierQuoteHistoryUpdateManyArgs;

void (seedWorkOrders satisfies (
  prisma: WorkOrderSeedPrismaClient,
  now: Date,
) => Promise<void>);

describe('work-order seeds', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const prismaSeedPath = path.join(projectRoot, 'prisma', 'seed.ts');

  it('upserts stable sale and workshop work orders with deterministic child artifacts', async () => {
    const workOrderUpsert = jest
      .fn<Promise<unknown>, [WorkOrderUpsertArgs]>()
      .mockResolvedValue(undefined);
    const workshopDetailsDeleteMany = jest
      .fn<Promise<unknown>, [WorkshopWorkOrderDetailsDeleteManyArgs]>()
      .mockResolvedValue(undefined);
    const workshopDetailsCreateMany = jest
      .fn<Promise<unknown>, [WorkshopWorkOrderDetailsCreateManyArgs]>()
      .mockResolvedValue(undefined);
    const estimateUpsert = jest
      .fn<Promise<unknown>, [WorkOrderEstimateUpsertArgs]>()
      .mockResolvedValue(undefined);
    const estimateLineDeleteMany = jest
      .fn<Promise<unknown>, [WorkOrderEstimateLineDeleteManyArgs]>()
      .mockResolvedValue(undefined);
    const estimateLineCreateMany = jest
      .fn<Promise<unknown>, [WorkOrderEstimateLineCreateManyArgs]>()
      .mockResolvedValue(undefined);
    const actualCostDeleteMany = jest
      .fn<Promise<unknown>, [WorkOrderActualCostDeleteManyArgs]>()
      .mockResolvedValue(undefined);
    const actualCostCreateMany = jest
      .fn<Promise<unknown>, [WorkOrderActualCostCreateManyArgs]>()
      .mockResolvedValue(undefined);
    const paymentDeleteMany = jest
      .fn<Promise<unknown>, [WorkOrderPaymentDeleteManyArgs]>()
      .mockResolvedValue(undefined);
    const paymentCreateMany = jest
      .fn<Promise<unknown>, [WorkOrderPaymentCreateManyArgs]>()
      .mockResolvedValue(undefined);
    const inventoryMovementUpdateMany = jest
      .fn<Promise<unknown>, [InventoryMovementUpdateManyArgs]>()
      .mockResolvedValue(undefined);
    const inventoryMovementDeleteMany = jest
      .fn<Promise<unknown>, [InventoryMovementDeleteManyArgs]>()
      .mockResolvedValue(undefined);
    const inventoryMovementCreateMany = jest
      .fn<Promise<unknown>, [InventoryMovementCreateManyArgs]>()
      .mockResolvedValue(undefined);
    const supplierQuoteHistoryUpdateMany = jest
      .fn<Promise<unknown>, [SupplierQuoteHistoryUpdateManyArgs]>()
      .mockResolvedValue(undefined);

    const transactionClient = {
      workOrder: { upsert: workOrderUpsert },
      workshopWorkOrderDetails: {
        deleteMany: workshopDetailsDeleteMany,
        createMany: workshopDetailsCreateMany,
      },
      workOrderEstimate: { upsert: estimateUpsert },
      workOrderEstimateLine: {
        deleteMany: estimateLineDeleteMany,
        createMany: estimateLineCreateMany,
      },
      workOrderActualCost: {
        deleteMany: actualCostDeleteMany,
        createMany: actualCostCreateMany,
      },
      workOrderPayment: {
        deleteMany: paymentDeleteMany,
        createMany: paymentCreateMany,
      },
      inventoryMovement: {
        updateMany: inventoryMovementUpdateMany,
        deleteMany: inventoryMovementDeleteMany,
        createMany: inventoryMovementCreateMany,
      },
      supplierQuoteHistory: {
        updateMany: supplierQuoteHistoryUpdateMany,
      },
    };

    let transactionCallCount = 0;
    const transaction: WorkOrderSeedPrismaClient['$transaction'] = async <T>(
      callback: (
        transaction: WorkOrderSeedPrismaTransactionClient,
      ) => Promise<T>,
    ) => {
      transactionCallCount += 1;
      return callback(transactionClient);
    };

    await seedWorkOrders(
      {
        $transaction: transaction,
      },
      new Date('2026-05-10T12:00:00.000Z'),
    );

    expect(transactionCallCount).toBe(1);
    expect(workOrderUpsert).toHaveBeenCalledTimes(4);
    expect(workOrderUpsert.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'seed-work-order-sale-counter-quote' },
      create: {
        id: 'seed-work-order-sale-counter-quote',
        type: 'SALE',
        customerId: 'seed-customer-ana-gomez',
        summary: 'Venta de tobera y diagnóstico comercial',
      },
      update: {
        type: 'SALE',
        customerId: 'seed-customer-ana-gomez',
      },
    });
    expect(workOrderUpsert.mock.calls[1]?.[0]).toMatchObject({
      where: { id: 'seed-work-order-workshop-injector-repair' },
      create: {
        id: 'seed-work-order-workshop-injector-repair',
        type: 'WORKSHOP',
        customerId: 'seed-customer-acme-industrial',
        vehicleId: 'seed-vehicle-acme-foton-aumark',
        componentId: 'seed-component-acme-inyector',
        assignedEmployeeId: 'seed-employee-ana-torres',
        paymentStatus: 'PAID',
      },
    });
    expect(workOrderUpsert.mock.calls[2]?.[0]).toMatchObject({
      where: { id: 'seed-work-order-workshop-partial-payment' },
      create: {
        id: 'seed-work-order-workshop-partial-payment',
        assignedEmployeeId: 'seed-employee-ana-torres',
        paymentStatus: 'PARTIAL',
      },
    });
    expect(workOrderUpsert.mock.calls[3]?.[0]).toMatchObject({
      where: { id: 'seed-work-order-workshop-unknown-payable' },
      create: {
        id: 'seed-work-order-workshop-unknown-payable',
        assignedEmployeeId: 'seed-employee-ana-torres',
        paymentStatus: 'PARTIAL',
      },
    });
    expect(workshopDetailsDeleteMany).toHaveBeenCalledWith({
      where: {
        workOrderId: {
          in: [
            'seed-work-order-sale-counter-quote',
            'seed-work-order-workshop-injector-repair',
            'seed-work-order-workshop-partial-payment',
            'seed-work-order-workshop-unknown-payable',
          ],
        },
      },
    });
    const workshopDetailsCreateArgs =
      workshopDetailsCreateMany.mock.calls[0]?.[0];
    expect(workshopDetailsCreateArgs?.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'seed-workshop-details-injector-repair',
          workOrderId: 'seed-work-order-workshop-injector-repair',
          diagnosisRequired: true,
        }),
        expect.objectContaining({
          id: 'seed-workshop-details-partial-payment',
          workOrderId: 'seed-work-order-workshop-partial-payment',
        }),
        expect.objectContaining({
          id: 'seed-workshop-details-unknown-payable',
          workOrderId: 'seed-work-order-workshop-unknown-payable',
        }),
      ]),
    );
    expect(estimateUpsert).toHaveBeenCalledTimes(3);
    const firstEstimateUpsertArgs = estimateUpsert.mock.calls[0]?.[0];
    const secondEstimateUpsertArgs = estimateUpsert.mock.calls[1]?.[0];
    expect(firstEstimateUpsertArgs?.create).toMatchObject({
      laborHourlyCostSnapshot: 50000,
      recommendedMinimumPrice: 91200,
      recommendedPrice: 102600,
      recommendedHighPrice: 114000,
    });
    expect(secondEstimateUpsertArgs?.create).toMatchObject({
      laborHourlyCostSnapshot: 50000,
      recommendedMinimumPrice: 624000,
      recommendedPrice: 702000,
      recommendedHighPrice: 780000,
    });
    const estimateLineCreateArgs = estimateLineCreateMany.mock.calls[0]?.[0];
    expect(estimateLineCreateArgs?.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'seed-work-order-estimate-line-sale-part',
          estimateId: 'seed-work-order-estimate-sale-initial',
          inventoryItemId: 'seed-inventory-item-cotizable-tobera',
        }),
        expect.objectContaining({
          id: 'seed-work-order-estimate-line-workshop-service',
          estimateId: 'seed-work-order-estimate-workshop-final',
          serviceCatalogId: 'seed-service-reparacion',
        }),
        expect.objectContaining({
          id: 'seed-work-order-estimate-line-partial-service',
          estimateId: 'seed-work-order-estimate-partial-final',
          unitPrice: 250000,
        }),
      ]),
    );
    const actualCostCreateArgs = actualCostCreateMany.mock.calls[0]?.[0];
    expect(actualCostCreateArgs?.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'seed-work-order-actual-cost-workshop-purchase',
          workOrderId: 'seed-work-order-workshop-injector-repair',
          supplierId: 'seed-supplier-repuestos-central-main',
          supplierQuoteHistoryId: 'seed-supplier-quote-bosch-central-v2',
        }),
        expect.objectContaining({
          id: 'seed-work-order-actual-cost-partial-outsourced',
          workOrderId: 'seed-work-order-workshop-partial-payment',
          amount: 110000,
        }),
        expect.objectContaining({
          id: 'seed-work-order-actual-cost-unknown-outsourced',
          workOrderId: 'seed-work-order-workshop-unknown-payable',
          amount: 70000,
        }),
      ]),
    );
    const paymentCreateArgs = paymentCreateMany.mock.calls[0]?.[0];
    expect(paymentCreateArgs?.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'seed-work-order-payment-workshop-final',
          workOrderId: 'seed-work-order-workshop-injector-repair',
          amount: 620000,
        }),
        expect.objectContaining({
          id: 'seed-work-order-payment-partial-advance',
          workOrderId: 'seed-work-order-workshop-partial-payment',
          amount: 100000,
        }),
        expect.objectContaining({
          id: 'seed-work-order-payment-unknown-advance',
          workOrderId: 'seed-work-order-workshop-unknown-payable',
          amount: 30000,
        }),
      ]),
    );
    expect(inventoryMovementUpdateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'seed-inventory-movement-bosch-out-1' },
      data: {
        workOrderId: 'seed-work-order-workshop-injector-repair',
        isReservedForWorkOrder: true,
      },
    });
    expect(inventoryMovementDeleteMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: [
            'seed-work-order-inventory-release',
            'seed-work-order-inventory-consumption',
            'seed-work-order-inventory-sale',
          ],
        },
      },
    });
    expect(inventoryMovementCreateMany.mock.calls[0]?.[0].data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'seed-work-order-inventory-release',
          movementType: 'IN',
          reason: 'RETURN',
        }),
        expect.objectContaining({
          id: 'seed-work-order-inventory-consumption',
          movementType: 'OUT',
          reason: 'WORK_ORDER_CONSUMPTION',
        }),
        expect.objectContaining({
          id: 'seed-work-order-inventory-sale',
          movementType: 'OUT',
          reason: 'SALE',
        }),
      ]),
    );
    expect(supplierQuoteHistoryUpdateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'seed-supplier-quote-bosch-central-v2' },
      data: {
        workOrderId: 'seed-work-order-workshop-injector-repair',
      },
    });
    expect(supplierQuoteHistoryUpdateMany).toHaveBeenCalledTimes(1);
  });

  it('hooks work-order seeds into prisma/seed.ts after inventory and supplier quote seeds', () => {
    const seedSource = fs.readFileSync(prismaSeedPath, 'utf8');

    expect(seedSource).toContain(
      "import { seedWorkOrders } from './seed-work-orders';",
    );
    expect(
      seedSource.indexOf('await seedWorkOrders(prisma, now);'),
    ).toBeGreaterThan(
      seedSource.indexOf('await prisma.supplierQuoteHistory.upsert({'),
    );
  });
});
