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
    deleteMany(
      args: Prisma.WorkshopWorkOrderDetailsDeleteManyArgs,
    ): Promise<unknown>;
    createMany(
      args: Prisma.WorkshopWorkOrderDetailsCreateManyArgs,
    ): Promise<unknown>;
  };
  workOrderEstimate: {
    upsert(args: Prisma.WorkOrderEstimateUpsertArgs): Promise<unknown>;
  };
  workOrderEstimateLine: {
    deleteMany(
      args: Prisma.WorkOrderEstimateLineDeleteManyArgs,
    ): Promise<unknown>;
    createMany(
      args: Prisma.WorkOrderEstimateLineCreateManyArgs,
    ): Promise<unknown>;
  };
  workOrderActualCost: {
    deleteMany(
      args: Prisma.WorkOrderActualCostDeleteManyArgs,
    ): Promise<unknown>;
    createMany(
      args: Prisma.WorkOrderActualCostCreateManyArgs,
    ): Promise<unknown>;
  };
  workOrderPayment: {
    deleteMany(args: Prisma.WorkOrderPaymentDeleteManyArgs): Promise<unknown>;
    createMany(args: Prisma.WorkOrderPaymentCreateManyArgs): Promise<unknown>;
  };
  inventoryMovement: {
    updateMany(args: Prisma.InventoryMovementUpdateManyArgs): Promise<unknown>;
    deleteMany?(args: Prisma.InventoryMovementDeleteManyArgs): Promise<unknown>;
    createMany?(args: Prisma.InventoryMovementCreateManyArgs): Promise<unknown>;
  };
  supplierQuoteHistory: {
    updateMany(
      args: Prisma.SupplierQuoteHistoryUpdateManyArgs,
    ): Promise<unknown>;
  };
};

export type WorkOrderSeedPrismaClient = {
  $transaction<T>(
    callback: (transaction: WorkOrderSeedPrismaTransactionClient) => Promise<T>,
  ): Promise<T>;
};

const saleWorkOrderId = 'seed-work-order-sale-counter-quote';
const workshopWorkOrderId = 'seed-work-order-workshop-injector-repair';
const partialPaymentWorkOrderId = 'seed-work-order-workshop-partial-payment';
const unknownPayableWorkOrderId = 'seed-work-order-workshop-unknown-payable';
const workshopEstimateId = 'seed-work-order-estimate-workshop-final';
const saleEstimateId = 'seed-work-order-estimate-sale-initial';
const partialPaymentEstimateId = 'seed-work-order-estimate-partial-final';

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
    externalLink:
      'https://mecanismos.test/work-orders/seed-workshop-injector-repair',
    notes:
      'Caso WORKSHOP con detalle, estimate FINAL, costo real y pago total.',
    estimatedCompletionAt: new Date('2026-05-08T17:00:00.000Z'),
    estimatedCollectionAt: new Date('2026-05-09T15:00:00.000Z'),
    completedAt: new Date('2026-05-09T13:30:00.000Z'),
  },
  {
    id: partialPaymentWorkOrderId,
    type: WorkOrderType.WORKSHOP,
    status: WorkOrderStatus.IN_PROGRESS,
    paymentStatus: PaymentStatus.PARTIAL,
    customerId: 'seed-customer-ana-gomez',
    vehicleId: 'seed-vehicle-ana-hilux',
    componentId: 'seed-component-ana-tobera',
    assignedEmployeeId: 'seed-employee-ana-torres',
    summary: 'Servicio parcial con anticipo y saldo pendiente',
    externalLink:
      'https://mecanismos.test/work-orders/seed-workshop-partial-payment',
    notes:
      'Caso WORKSHOP con estimate FINAL y pago parcial para reportes de receivables.',
    estimatedCompletionAt: new Date('2026-05-18T17:00:00.000Z'),
    estimatedCollectionAt: new Date('2026-05-19T15:00:00.000Z'),
    completedAt: null,
  },
  {
    id: unknownPayableWorkOrderId,
    type: WorkOrderType.WORKSHOP,
    status: WorkOrderStatus.IN_PROGRESS,
    paymentStatus: PaymentStatus.PARTIAL,
    customerId: 'seed-customer-acme-industrial',
    vehicleId: 'seed-vehicle-acme-foton-aumark',
    componentId: 'seed-component-acme-inyector',
    assignedEmployeeId: 'seed-employee-ana-torres',
    summary: 'Trabajo asignado sin estimate publicado',
    externalLink:
      'https://mecanismos.test/work-orders/seed-workshop-unknown-payable',
    notes:
      'Caso WORKSHOP para payable desconocido con costo real y anticipo ya registrados.',
    estimatedCompletionAt: new Date('2026-05-21T17:00:00.000Z'),
    estimatedCollectionAt: new Date('2026-05-21T18:00:00.000Z'),
    completedAt: null,
  },
] as const;

const workshopDetails = [
  {
    id: 'seed-workshop-details-injector-repair',
    workOrderId: workshopWorkOrderId,
    customerReportedIssue:
      'El inyector presenta retorno excesivo y pérdida de potencia.',
    diagnosisRequired: true,
    diagnosisSummary:
      'Se confirmó desgaste interno y se requirió reparación + calibración final.',
  },
  {
    id: 'seed-workshop-details-partial-payment',
    workOrderId: partialPaymentWorkOrderId,
    customerReportedIssue:
      'El vehículo presenta falla intermitente y requiere avance parcial.',
    diagnosisRequired: true,
    diagnosisSummary:
      'Se autorizó anticipo para diagnóstico y servicio correctivo aún en curso.',
  },
  {
    id: 'seed-workshop-details-unknown-payable',
    workOrderId: unknownPayableWorkOrderId,
    customerReportedIssue:
      'Pendiente definición de alcance final antes de emitir estimate.',
    diagnosisRequired: true,
    diagnosisSummary:
      'Ya hay costos y un anticipo, pero todavía no se publica estimate INITIAL/FINAL.',
  },
] as const;

const estimates = [
  {
    id: saleEstimateId,
    workOrderId: saleWorkOrderId,
    phase: EstimatePhase.INITIAL,
    estimatedLaborHours: '0.50',
    laborHourlyCostSnapshot: 50000,
    baseCostAmount: 76000,
    contingencyPct: 0,
    contingencyAmount: 0,
    totalCostAmount: 76000,
    totalPriceAmount: 125000,
    recommendedMinimumPrice: 91200,
    recommendedPrice: 102600,
    recommendedHighPrice: 114000,
    notes: 'Oferta comercial rápida para mostrador.',
  },
  {
    id: workshopEstimateId,
    workOrderId: workshopWorkOrderId,
    phase: EstimatePhase.FINAL,
    estimatedLaborHours: '3.50',
    laborHourlyCostSnapshot: 50000,
    baseCostAmount: 480000,
    contingencyPct: 8,
    contingencyAmount: 40000,
    totalCostAmount: 520000,
    totalPriceAmount: 620000,
    recommendedMinimumPrice: 624000,
    recommendedPrice: 702000,
    recommendedHighPrice: 780000,
    notes: 'Incluye repuesto, reparación y calibración.',
  },
  {
    id: partialPaymentEstimateId,
    workOrderId: partialPaymentWorkOrderId,
    phase: EstimatePhase.FINAL,
    estimatedLaborHours: '2.00',
    laborHourlyCostSnapshot: 50000,
    baseCostAmount: 180000,
    contingencyPct: 0,
    contingencyAmount: 0,
    totalCostAmount: 180000,
    totalPriceAmount: 250000,
    recommendedMinimumPrice: 216000,
    recommendedPrice: 243000,
    recommendedHighPrice: 270000,
    notes: 'Estimate FINAL para el caso de pago parcial.',
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
  {
    id: 'seed-work-order-estimate-line-partial-service',
    estimateId: partialPaymentEstimateId,
    lineType: EstimateLineType.SERVICE,
    description: 'Servicio correctivo con anticipo parcial',
    inventoryItemId: null,
    serviceCatalogId: 'seed-service-reparacion',
    supplierId: null,
    supplierQuoteHistoryId: null,
    quantity: 1,
    unitCost: 180000,
    unitPrice: 250000,
    notes: 'Línea única para receivable parcial.',
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
  {
    id: 'seed-work-order-actual-cost-partial-outsourced',
    workOrderId: partialPaymentWorkOrderId,
    category: WorkOrderCostCategory.OUTSOURCED_SERVICE,
    description: 'Servicio tercerizado para diagnóstico parcial',
    amount: 110000,
    supplierId: null,
    inventoryItemId: null,
    supplierQuoteHistoryId: null,
    paymentMethod: PaymentMethod.OTHER,
    incurredAt: new Date('2026-05-18T11:00:00.000Z'),
    notes: 'Costo real del caso con saldo pendiente.',
  },
  {
    id: 'seed-work-order-actual-cost-unknown-outsourced',
    workOrderId: unknownPayableWorkOrderId,
    category: WorkOrderCostCategory.OUTSOURCED_SERVICE,
    description: 'Diagnóstico avanzado antes de estimate',
    amount: 70000,
    supplierId: null,
    inventoryItemId: null,
    supplierQuoteHistoryId: null,
    paymentMethod: PaymentMethod.TRANSFER,
    incurredAt: new Date('2026-05-20T09:15:00.000Z'),
    notes: 'Sirve para reportes con payable desconocido.',
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
  {
    id: 'seed-work-order-payment-partial-advance',
    workOrderId: partialPaymentWorkOrderId,
    amount: 100000,
    paymentMethod: PaymentMethod.CASH,
    paidAt: new Date('2026-05-18T15:30:00.000Z'),
    notes: 'Anticipo del caso con pago parcial.',
  },
  {
    id: 'seed-work-order-payment-unknown-advance',
    workOrderId: unknownPayableWorkOrderId,
    amount: 30000,
    paymentMethod: PaymentMethod.TRANSFER,
    paidAt: new Date('2026-05-20T16:45:00.000Z'),
    notes: 'Anticipo registrado antes de publicar estimate.',
  },
] as const;

const workOrderInventoryMovements = [
  {
    id: 'seed-work-order-inventory-release',
    inventoryItemId: 'seed-inventory-item-bosch-inyector',
    movementType: 'IN',
    reason: 'RETURN',
    quantity: 1,
    unitCost: 182000,
    supplierId: null,
    workOrderId: workshopWorkOrderId,
    isReservedForWorkOrder: false,
    occurredAt: new Date('2026-05-08T11:00:00.000Z'),
    notes: 'Liberación parcial de la reserva del caso taller.',
  },
  {
    id: 'seed-work-order-inventory-consumption',
    inventoryItemId: 'seed-inventory-item-bosch-inyector',
    movementType: 'OUT',
    reason: 'WORK_ORDER_CONSUMPTION',
    quantity: 1,
    unitCost: 182000,
    supplierId: 'seed-supplier-repuestos-central-main',
    workOrderId: workshopWorkOrderId,
    isReservedForWorkOrder: false,
    occurredAt: new Date('2026-05-08T12:00:00.000Z'),
    notes: 'Consumo real del inyector reservado.',
  },
  {
    id: 'seed-work-order-inventory-sale',
    inventoryItemId: 'seed-inventory-item-bosch-inyector',
    movementType: 'OUT',
    reason: 'SALE',
    quantity: 1,
    unitCost: 182000,
    supplierId: null,
    workOrderId: workshopWorkOrderId,
    isReservedForWorkOrder: false,
    occurredAt: new Date('2026-05-09T09:00:00.000Z'),
    notes: 'Venta del remanente asociada a la misma orden.',
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
          in: [
            saleWorkOrderId,
            workshopWorkOrderId,
            partialPaymentWorkOrderId,
            unknownPayableWorkOrderId,
          ],
        },
      },
    });
    await transaction.workshopWorkOrderDetails.createMany({
      data: workshopDetails.map((detail) => ({
        ...detail,
      })),
    });

    for (const estimate of estimates) {
      await transaction.workOrderEstimate.upsert({
        where: { id: estimate.id },
        create: {
          ...estimate,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          phase: estimate.phase,
          workOrderId: estimate.workOrderId,
          estimatedLaborHours: estimate.estimatedLaborHours,
          baseCostAmount: estimate.baseCostAmount,
          laborHourlyCostSnapshot: estimate.laborHourlyCostSnapshot,
          contingencyPct: estimate.contingencyPct,
          contingencyAmount: estimate.contingencyAmount,
          totalCostAmount: estimate.totalCostAmount,
          totalPriceAmount: estimate.totalPriceAmount,
          recommendedMinimumPrice: estimate.recommendedMinimumPrice,
          recommendedPrice: estimate.recommendedPrice,
          recommendedHighPrice: estimate.recommendedHighPrice,
          notes: estimate.notes,
          updatedAt: now,
        },
      });
    }

    await transaction.workOrderEstimateLine.deleteMany({
      where: {
        estimateId: {
          in: [saleEstimateId, workshopEstimateId, partialPaymentEstimateId],
        },
      },
    });
    await transaction.workOrderEstimateLine.createMany({
      data: estimateLines.map((line) => ({
        ...line,
        createdAt: now,
        updatedAt: now,
      })),
    });

    await transaction.workOrderActualCost.deleteMany({
      where: {
        workOrderId: {
          in: [
            saleWorkOrderId,
            workshopWorkOrderId,
            partialPaymentWorkOrderId,
            unknownPayableWorkOrderId,
          ],
        },
      },
    });
    await transaction.workOrderActualCost.createMany({
      data: actualCosts.map((actualCost) => ({
        ...actualCost,
        createdAt: now,
        updatedAt: now,
      })),
    });

    await transaction.workOrderPayment.deleteMany({
      where: {
        workOrderId: {
          in: [
            saleWorkOrderId,
            workshopWorkOrderId,
            partialPaymentWorkOrderId,
            unknownPayableWorkOrderId,
          ],
        },
      },
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
    if (
      transaction.inventoryMovement.deleteMany &&
      transaction.inventoryMovement.createMany
    ) {
      await transaction.inventoryMovement.deleteMany({
        where: {
          id: {
            in: workOrderInventoryMovements.map((movement) => movement.id),
          },
        },
      });
      await transaction.inventoryMovement.createMany({
        data: workOrderInventoryMovements.map((movement) => ({
          ...movement,
          createdAt: now,
        })),
      });
    }

    await transaction.supplierQuoteHistory.updateMany({
      where: { id: 'seed-supplier-quote-bosch-central-v2' },
      data: {
        workOrderId: workshopWorkOrderId,
      },
    });
  });
}
