import type { Prisma } from '../generated/prisma/client';
import {
  EstimateLineType,
  EstimatePhase,
  PaymentMethod,
  PaymentStatus,
  WorkOrderCostCategory,
  WorkOrderStatus,
  WorkOrderType,
} from '../generated/prisma/enums';

export type WorkOrderSeedPrismaTransactionClient = {
  workOrder: {
    upsert(args: Prisma.WorkOrderUpsertArgs): Promise<unknown>;
  };
  workshopWorkOrderDetails: {
    deleteMany(args: Prisma.WorkshopWorkOrderDetailsDeleteManyArgs): Promise<unknown>;
    createMany(args: Prisma.WorkshopWorkOrderDetailsCreateManyArgs): Promise<unknown>;
  };
  workOrderEstimate: {
    upsert(args: Prisma.WorkOrderEstimateUpsertArgs): Promise<unknown>;
  };
  workOrderEstimateLine: {
    deleteMany(args: Prisma.WorkOrderEstimateLineDeleteManyArgs): Promise<unknown>;
    createMany(args: Prisma.WorkOrderEstimateLineCreateManyArgs): Promise<unknown>;
  };
  workOrderActualCost: {
    deleteMany(args: Prisma.WorkOrderActualCostDeleteManyArgs): Promise<unknown>;
    createMany(args: Prisma.WorkOrderActualCostCreateManyArgs): Promise<unknown>;
  };
  workOrderPayment: {
    deleteMany(args: Prisma.WorkOrderPaymentDeleteManyArgs): Promise<unknown>;
    createMany(args: Prisma.WorkOrderPaymentCreateManyArgs): Promise<unknown>;
  };
  inventoryMovement: {
    updateMany(args: Prisma.InventoryMovementUpdateManyArgs): Promise<unknown>;
  };
  supplierQuoteHistory: {
    updateMany(args: Prisma.SupplierQuoteHistoryUpdateManyArgs): Promise<unknown>;
  };
};

export type WorkOrderSeedPrismaClient = {
  $transaction<T>(
    callback: (transaction: WorkOrderSeedPrismaTransactionClient) => Promise<T>,
  ): Promise<T>;
};

const saleWorkOrderId = 'seed-work-order-sale-counter-quote';
const workshopWorkOrderId = 'seed-work-order-workshop-injector-repair';
const workshopEstimateId = 'seed-work-order-estimate-workshop-final';
const saleEstimateId = 'seed-work-order-estimate-sale-initial';

const seedWorkOrderRows = [
  {
    id: saleWorkOrderId,
    type: WorkOrderType.SALE,
    status: WorkOrderStatus.IN_PROGRESS,
    paymentStatus: PaymentStatus.PENDING,
    customerId: 'seed-customer-ana-gomez',
    vehicleId: null,
    componentId: null,
    assignedEmployeeId: null,
    summary: 'Venta de tobera y diagnóstico comercial',
    externalLink: 'https://mecanismos.test/work-orders/seed-sale-counter-quote',
    notes: 'Usar este caso para rutas SALE sin detalles de taller.',
    estimatedCompletionAt: new Date('2026-05-14T17:00:00.000Z'),
    estimatedCollectionAt: new Date('2026-05-14T18:00:00.000Z'),
    completedAt: null,
  },
  {
    id: workshopWorkOrderId,
    type: WorkOrderType.WORKSHOP,
    status: WorkOrderStatus.COMPLETED,
    paymentStatus: PaymentStatus.PAID,
    customerId: 'seed-customer-acme-industrial',
    vehicleId: 'seed-vehicle-acme-foton-aumark',
    componentId: 'seed-component-acme-inyector',
    assignedEmployeeId: 'seed-employee-ana-torres',
    summary: 'Reparación integral de inyector Bosch',
    externalLink: 'https://mecanismos.test/work-orders/seed-workshop-injector-repair',
    notes: 'Caso WORKSHOP con detalle, estimate FINAL, costo real y pago total.',
    estimatedCompletionAt: new Date('2026-05-08T17:00:00.000Z'),
    estimatedCollectionAt: new Date('2026-05-09T15:00:00.000Z'),
    completedAt: new Date('2026-05-09T13:30:00.000Z'),
  },
] as const;

const workshopDetails = {
  id: 'seed-workshop-details-injector-repair',
  workOrderId: workshopWorkOrderId,
  customerReportedIssue: 'El inyector presenta retorno excesivo y pérdida de potencia.',
  diagnosisRequired: true,
  diagnosisSummary: 'Se confirmó desgaste interno y se requirió reparación + calibración final.',
} as const;

const estimates = [
  {
    id: saleEstimateId,
    workOrderId: saleWorkOrderId,
    phase: EstimatePhase.INITIAL,
    estimatedLaborHours: '0.50',
    baseCostAmount: 76000,
    contingencyPct: 0,
    contingencyAmount: 0,
    totalCostAmount: 76000,
    totalPriceAmount: 125000,
    notes: 'Oferta comercial rápida para mostrador.',
  },
  {
    id: workshopEstimateId,
    workOrderId: workshopWorkOrderId,
    phase: EstimatePhase.FINAL,
    estimatedLaborHours: '3.50',
    baseCostAmount: 480000,
    contingencyPct: 8,
    contingencyAmount: 40000,
    totalCostAmount: 520000,
    totalPriceAmount: 620000,
    notes: 'Incluye repuesto, reparación y calibración.',
  },
] as const;

const estimateLines = [
  {
    id: 'seed-work-order-estimate-line-sale-part',
    estimateId: saleEstimateId,
    lineType: EstimateLineType.PART,
    description: 'Tobera Denso cotizable',
    inventoryItemId: 'seed-inventory-item-cotizable-tobera',
    serviceCatalogId: null,
    supplierId: 'seed-supplier-repuestos-central-duplicate',
    supplierQuoteHistoryId: 'seed-supplier-quote-tobera-aliado-voided',
    quantity: 1,
    unitCost: 76000,
    unitPrice: 125000,
    notes: 'Mantener como ejemplo de venta sin taller.',
  },
  {
    id: 'seed-work-order-estimate-line-workshop-part',
    estimateId: workshopEstimateId,
    lineType: EstimateLineType.PART,
    description: 'Inyector Bosch 0445120231',
    inventoryItemId: 'seed-inventory-item-bosch-inyector',
    serviceCatalogId: null,
    supplierId: 'seed-supplier-repuestos-central-main',
    supplierQuoteHistoryId: 'seed-supplier-quote-bosch-central-v2',
    quantity: 1,
    unitCost: 182000,
    unitPrice: 290000,
    notes: 'Costo respaldado por cotización activa.',
  },
  {
    id: 'seed-work-order-estimate-line-workshop-service',
    estimateId: workshopEstimateId,
    lineType: EstimateLineType.SERVICE,
    description: 'Reparación y calibración de inyector',
    inventoryItemId: null,
    serviceCatalogId: 'seed-service-reparacion',
    supplierId: null,
    supplierQuoteHistoryId: null,
    quantity: 1,
    unitCost: 338000,
    unitPrice: 330000,
    notes: 'Servicio principal del caso WORKSHOP.',
  },
] as const;

const actualCosts = [
  {
    id: 'seed-work-order-actual-cost-workshop-purchase',
    workOrderId: workshopWorkOrderId,
    category: WorkOrderCostCategory.DIRECT_PURCHASE,
    description: 'Compra directa de inyector Bosch para reparación',
    amount: 182000,
    supplierId: 'seed-supplier-repuestos-central-main',
    inventoryItemId: 'seed-inventory-item-bosch-inyector',
    supplierQuoteHistoryId: 'seed-supplier-quote-bosch-central-v2',
    paymentMethod: PaymentMethod.TRANSFER,
    incurredAt: new Date('2026-05-08T10:30:00.000Z'),
    notes: 'Costo real enlazado a cotización activa.',
  },
] as const;

const payments = [
  {
    id: 'seed-work-order-payment-workshop-final',
    workOrderId: workshopWorkOrderId,
    amount: 620000,
    paymentMethod: PaymentMethod.TRANSFER,
    paidAt: new Date('2026-05-09T16:00:00.000Z'),
    notes: 'Pago total contra estimate FINAL.',
  },
] as const;

export async function seedWorkOrders(
  prisma: WorkOrderSeedPrismaClient,
  now: Date,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    for (const seedWorkOrder of seedWorkOrderRows) {
      await transaction.workOrder.upsert({
        where: { id: seedWorkOrder.id },
        create: {
          ...seedWorkOrder,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          type: seedWorkOrder.type,
          status: seedWorkOrder.status,
          paymentStatus: seedWorkOrder.paymentStatus,
          customerId: seedWorkOrder.customerId,
          vehicleId: seedWorkOrder.vehicleId,
          componentId: seedWorkOrder.componentId,
          assignedEmployeeId: seedWorkOrder.assignedEmployeeId,
          summary: seedWorkOrder.summary,
          externalLink: seedWorkOrder.externalLink,
          notes: seedWorkOrder.notes,
          estimatedCompletionAt: seedWorkOrder.estimatedCompletionAt,
          estimatedCollectionAt: seedWorkOrder.estimatedCollectionAt,
          completedAt: seedWorkOrder.completedAt,
          updatedAt: now,
        },
      });
    }

    await transaction.workshopWorkOrderDetails.deleteMany({
      where: {
        workOrderId: {
          in: [saleWorkOrderId, workshopWorkOrderId],
        },
      },
    });
    await transaction.workshopWorkOrderDetails.createMany({
      data: [{
        ...workshopDetails,
      }],
    });

    for (const estimate of estimates) {
      await transaction.workOrderEstimate.upsert({
        where: { id: estimate.id },
        create: {
          ...estimate,
          recommendedMinimumPrice: null,
          recommendedPrice: null,
          recommendedHighPrice: null,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          phase: estimate.phase,
          workOrderId: estimate.workOrderId,
          estimatedLaborHours: estimate.estimatedLaborHours,
          baseCostAmount: estimate.baseCostAmount,
          contingencyPct: estimate.contingencyPct,
          contingencyAmount: estimate.contingencyAmount,
          totalCostAmount: estimate.totalCostAmount,
          totalPriceAmount: estimate.totalPriceAmount,
          recommendedMinimumPrice: null,
          recommendedPrice: null,
          recommendedHighPrice: null,
          notes: estimate.notes,
          updatedAt: now,
        },
      });
    }

    await transaction.workOrderEstimateLine.deleteMany({
      where: { estimateId: { in: [saleEstimateId, workshopEstimateId] } },
    });
    await transaction.workOrderEstimateLine.createMany({
      data: estimateLines.map((line) => ({
        ...line,
        createdAt: now,
        updatedAt: now,
      })),
    });

    await transaction.workOrderActualCost.deleteMany({
      where: { workOrderId: { in: [saleWorkOrderId, workshopWorkOrderId] } },
    });
    await transaction.workOrderActualCost.createMany({
      data: actualCosts.map((actualCost) => ({
        ...actualCost,
        createdAt: now,
        updatedAt: now,
      })),
    });

    await transaction.workOrderPayment.deleteMany({
      where: { workOrderId: { in: [saleWorkOrderId, workshopWorkOrderId] } },
    });
    await transaction.workOrderPayment.createMany({
      data: payments.map((payment) => ({
        ...payment,
        createdAt: now,
        updatedAt: now,
      })),
    });

    await transaction.inventoryMovement.updateMany({
      where: { id: 'seed-inventory-movement-bosch-out-1' },
      data: {
        workOrderId: workshopWorkOrderId,
        isReservedForWorkOrder: true,
      },
    });

    await transaction.supplierQuoteHistory.updateMany({
      where: { id: 'seed-supplier-quote-bosch-central-v2' },
      data: {
        workOrderId: workshopWorkOrderId,
      },
    });
  });
}
