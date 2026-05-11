import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import {
  InventoryCondition,
  InventoryItemType,
  InventoryMovementReason,
  InventoryMovementType,
  PaymentMethod,
  PaymentStatus,
  WorkOrderCostCategory,
  WorkOrderStatus,
  WorkOrderType,
} from '../../generated/prisma/enums';
import { createE2EApp } from '../support/create-e2e-app';
import { loginAsRole } from '../support/auth-e2e';
import { PrismaService } from '../../src/prisma/prisma.service';

type WorkOrderResponse = {
  id: string;
  number: number;
  type: WorkOrderType;
  status: WorkOrderStatus;
  paymentStatus: PaymentStatus;
  customerId: string;
  vehicleId: string | null;
  componentId: string | null;
  assignedEmployeeId: string | null;
  summary: string;
  workshopDetails: {
    diagnosisRequired: boolean;
    customerReportedIssue: string | null;
    diagnosisSummary: string | null;
  } | null;
  estimates: Array<{
    id: string;
    phase: string;
    totalPriceAmount: number;
  }>;
  actualCosts: Array<{
    id: string;
    category: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
  }>;
  inventoryActivity: Array<{
    inventoryItemId: string;
    activeReservedQuantity: number;
    consumedQuantity: number;
    soldQuantity: number;
    actualCostIds: string[];
    movements: Array<{
      id: string;
      reason: string;
      quantity: number;
      actualCostId: string | null;
    }>;
  }>;
};

type WorkOrderListResponse = {
  data: WorkOrderResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type EstimateResponse = {
  id: string;
  phase: string;
  estimatedLaborHours: number | null;
  laborHourlyCostSnapshot: number | null;
  baseCostAmount: number;
  contingencyPct: number | null;
  totalCostAmount: number;
  totalPriceAmount: number;
  recommendedMinimumPrice: number | null;
  recommendedPrice: number | null;
  recommendedHighPrice: number | null;
  lines: Array<{
    id: string;
    lineType: string;
    description: string;
    quantity: number;
    supplierQuoteHistoryId: string | null;
  }>;
};

type EstimateListResponse = {
  data: EstimateResponse[];
};

type ActualCostResponse = {
  id: string;
  category: string;
  description: string;
  amount: number;
  supplierId: string | null;
};

type ActualCostListResponse = {
  data: ActualCostResponse[];
};

describe('WorkOrdersController (real db e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.AUTH_ACCESS_TOKEN_SECRET = 'access-secret';
    process.env.AUTH_REFRESH_TOKEN_SECRET = 'refresh-secret';
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';
    app = await createE2EApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated and unauthorized work-order access', async () => {
    await request(app.getHttpServer()).get('/work-orders').expect(401);

    const mechanicCookies = await loginAsRole(app, 'MECHANIC');

    await request(app.getHttpServer())
      .get('/work-orders')
      .set('Cookie', mechanicCookies)
      .expect(403);
  });

  it('validates create payloads and rejects mismatched customer assets', async () => {
    const cookies = await loginAsRole(app, 'SALES');

    await request(app.getHttpServer())
      .post('/work-orders')
      .set('Cookie', cookies)
      .send({
        type: WorkOrderType.SALE,
        summary: 'Sin cliente',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/work-orders')
      .set('Cookie', cookies)
      .send({
        type: WorkOrderType.WORKSHOP,
        customerId: 'seed-customer-acme-industrial',
        vehicleId: 'seed-vehicle-ana-hilux',
        summary: 'Vehículo ajeno',
      })
      .expect(400)
      .expect(({ body }: { body: { message: string | string[] } }) => {
        expect(body.message).toContain(
          'Vehicle seed-vehicle-ana-hilux does not belong to customer seed-customer-acme-industrial',
        );
      });
  });

  it('supports authenticated CRUD flows for workshop work orders', async () => {
    const cookies = await loginAsRole(app, 'ADMIN');
    const runId = `wo-${Date.now()}`;

    const createdResponse = await request(app.getHttpServer())
      .post('/work-orders')
      .set('Cookie', cookies)
      .send({
        type: WorkOrderType.WORKSHOP,
        customerId: 'seed-customer-acme-industrial',
        vehicleId: 'seed-vehicle-acme-foton-aumark',
        componentId: 'seed-component-acme-inyector',
        assignedEmployeeId: 'seed-employee-ana-torres',
        summary: `  Diagnóstico integral ${runId}  `,
        notes: '  Revisar presión y retorno  ',
        customerReportedIssue: '  No arranca en frío  ',
        diagnosisRequired: true,
      })
      .expect(201);
    const created = readBody<WorkOrderResponse>(createdResponse);

    expect(created.type).toBe(WorkOrderType.WORKSHOP);
    expect(created.status).toBe(WorkOrderStatus.IN_PROGRESS);
    expect(created.paymentStatus).toBe(PaymentStatus.PENDING);
    expect(created.summary).toBe(`Diagnóstico integral ${runId}`);
    expect(created.workshopDetails).toMatchObject({
      diagnosisRequired: true,
      customerReportedIssue: 'No arranca en frío',
    });

    const listResponse = await request(app.getHttpServer())
      .get(
        `/work-orders?page=1&limit=10&status=${WorkOrderStatus.IN_PROGRESS}&customerId=seed-customer-acme-industrial&search=${encodeURIComponent(runId)}`,
      )
      .set('Cookie', cookies)
      .expect(200);
    const listBody = readBody<WorkOrderListResponse>(listResponse);

    expect(listBody.meta).toMatchObject({ page: 1, limit: 10 });
    expect(listBody.data.some((item) => item.id === created.id)).toBe(true);

    await request(app.getHttpServer())
      .get(`/work-orders/${created.id}`)
      .set('Cookie', cookies)
      .expect(200)
      .expect(({ body }: { body: WorkOrderResponse }) => {
        expect(body.id).toBe(created.id);
        expect(body.vehicleId).toBe('seed-vehicle-acme-foton-aumark');
        expect(body.componentId).toBe('seed-component-acme-inyector');
      });

    await request(app.getHttpServer())
      .patch(`/work-orders/${created.id}`)
      .set('Cookie', cookies)
      .send({
        summary: `  Diagnóstico resuelto ${runId}  `,
        status: WorkOrderStatus.COMPLETED,
        completedAt: '2026-05-12T20:00:00.000Z',
      })
      .expect(200)
      .expect(({ body }: { body: WorkOrderResponse }) => {
        expect(body.summary).toBe(`Diagnóstico resuelto ${runId}`);
        expect(body.status).toBe(WorkOrderStatus.COMPLETED);
      });
  });

  it('replaces estimate lines atomically for a single phase', async () => {
    const cookies = await loginAsRole(app, 'ADMIN');
    const workOrderId = await createSaleWorkOrder(
      app,
      cookies,
      `estimate-${Date.now()}`,
    );

    await request(app.getHttpServer())
      .put(`/work-orders/${workOrderId}/estimates/INITIAL`)
      .set('Cookie', cookies)
      .send({
        estimatedLaborHours: 3.5,
        baseCostAmount: 180000,
        totalCostAmount: 210000,
        totalPriceAmount: 320000,
        notes: '  Primera estimación  ',
        lines: [
          {
            lineType: 'PART',
            description: '  Inyector Bosch  ',
            quantity: 1,
            unitCost: 182000,
            unitPrice: 250000,
            supplierId: 'seed-supplier-repuestos-central-main',
            inventoryItemId: 'seed-inventory-item-bosch-inyector',
            supplierQuoteHistoryId: 'seed-supplier-quote-bosch-central-v1',
          },
          {
            lineType: 'SERVICE',
            description: '  Diagnóstico banco  ',
            quantity: 1,
            unitCost: 0,
            unitPrice: 70000,
            serviceCatalogId: 'seed-service-diagnostico',
          },
        ],
      })
      .expect(200)
      .expect(({ body }: { body: EstimateResponse }) => {
        expect(body.phase).toBe('INITIAL');
        expect(body.lines).toHaveLength(2);
      });

    const replacedResponse = await request(app.getHttpServer())
      .put(`/work-orders/${workOrderId}/estimates/INITIAL`)
      .set('Cookie', cookies)
      .send({
        estimatedLaborHours: 2,
        baseCostAmount: 70000,
        totalCostAmount: 70000,
        totalPriceAmount: 120000,
        lines: [
          {
            lineType: 'OTHER',
            description: '  Ajuste final  ',
            quantity: 1,
            unitCost: 70000,
            unitPrice: 120000,
          },
        ],
      })
      .expect(200);
    const replaced = readBody<EstimateResponse>(replacedResponse);

    expect(replaced.lines).toHaveLength(1);
    expect(replaced.lines[0]).toMatchObject({
      lineType: 'OTHER',
      description: 'Ajuste final',
      quantity: 1,
    });

    await request(app.getHttpServer())
      .get(`/work-orders/${workOrderId}/estimates`)
      .set('Cookie', cookies)
      .expect(200)
      .expect(({ body }: { body: EstimateListResponse }) => {
        expect(body.data).toHaveLength(1);
        expect(body.data[0].phase).toBe('INITIAL');
        expect(body.data[0].lines).toHaveLength(1);
        expect(body.data[0].lines[0].supplierQuoteHistoryId).toBeNull();
      });
  });

  it('applies current pricing settings to future estimates and keeps prior snapshots unchanged after later edits', async () => {
    const cookies = await loginAsRole(app, 'ADMIN');

    await request(app.getHttpServer())
      .patch('/app-settings/pricing-labor')
      .set('Cookie', cookies)
      .send({
        defaultLaborHourlyRate: 60000,
        saleContingencyPct: 10,
        workshopContingencyPct: 15,
        diagnosticContingencyPct: 25,
        minimumMarkupPct: 20,
        recommendedMarkupPct: 30,
        highMarkupPct: 40,
      })
      .expect(200);

    const firstWorkOrderId = await createSaleWorkOrder(
      app,
      cookies,
      `settings-old-${Date.now()}`,
    );

    await request(app.getHttpServer())
      .put(`/work-orders/${firstWorkOrderId}/estimates/INITIAL`)
      .set('Cookie', cookies)
      .send({
        estimatedLaborHours: 2,
        lines: [
          {
            lineType: 'PART',
            description: 'Inyector snapshot',
            quantity: 1,
            unitCost: 100000,
          },
        ],
      })
      .expect(200)
      .expect(({ body }: { body: EstimateResponse }) => {
        expect(body.laborHourlyCostSnapshot).toBe(60000);
        expect(body.baseCostAmount).toBe(220000);
        expect(body.contingencyPct).toBe(10);
        expect(body.totalCostAmount).toBe(242000);
        expect(body.recommendedMinimumPrice).toBe(290400);
        expect(body.recommendedPrice).toBe(314600);
        expect(body.recommendedHighPrice).toBe(338800);
        expect(body.totalPriceAmount).toBe(314600);
      });

    await request(app.getHttpServer())
      .patch('/app-settings/pricing-labor')
      .set('Cookie', cookies)
      .send({
        defaultLaborHourlyRate: 90000,
        saleContingencyPct: 20,
        recommendedMarkupPct: 45,
      })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/work-orders/${firstWorkOrderId}/estimates`)
      .set('Cookie', cookies)
      .expect(200)
      .expect(({ body }: { body: EstimateListResponse }) => {
        expect(body.data[0]).toMatchObject({
          laborHourlyCostSnapshot: 60000,
          baseCostAmount: 220000,
          contingencyPct: 10,
          totalCostAmount: 242000,
          recommendedPrice: 314600,
        });
      });

    const secondWorkOrderId = await createSaleWorkOrder(
      app,
      cookies,
      `settings-new-${Date.now()}`,
    );

    await request(app.getHttpServer())
      .put(`/work-orders/${secondWorkOrderId}/estimates/INITIAL`)
      .set('Cookie', cookies)
      .send({ estimatedLaborHours: 1, lines: [] })
      .expect(200)
      .expect(({ body }: { body: EstimateResponse }) => {
        expect(body.laborHourlyCostSnapshot).toBe(90000);
        expect(body.baseCostAmount).toBe(90000);
        expect(body.contingencyPct).toBe(20);
        expect(body.totalCostAmount).toBe(108000);
        expect(body.recommendedPrice).toBe(156600);
      });
  });

  it('respects explicit snapshot overrides even when singleton settings define different defaults', async () => {
    const cookies = await loginAsRole(app, 'ADMIN');

    await request(app.getHttpServer())
      .patch('/app-settings/pricing-labor')
      .set('Cookie', cookies)
      .send({
        defaultLaborHourlyRate: 50000,
        diagnosticContingencyPct: 25,
        recommendedMarkupPct: 35,
      })
      .expect(200);

    const workOrderId = await createWorkshopWorkOrder(
      app,
      cookies,
      `override-${Date.now()}`,
    );

    await request(app.getHttpServer())
      .put(`/work-orders/${workOrderId}/estimates/FINAL`)
      .set('Cookie', cookies)
      .send({
        estimatedLaborHours: 1,
        laborHourlyCostSnapshot: 70000,
        baseCostAmount: 90000,
        contingencyPct: 3,
        totalCostAmount: 93000,
        recommendedMinimumPrice: 110000,
        recommendedPrice: 120000,
        recommendedHighPrice: 135000,
        totalPriceAmount: 120000,
        lines: [],
      })
      .expect(200)
      .expect(({ body }: { body: EstimateResponse }) => {
        expect(body.laborHourlyCostSnapshot).toBe(70000);
        expect(body.contingencyPct).toBe(3);
        expect(body.recommendedMinimumPrice).toBe(110000);
        expect(body.recommendedPrice).toBe(120000);
        expect(body.recommendedHighPrice).toBe(135000);
        expect(body.totalPriceAmount).toBe(120000);
      });
  });

  it('rejects estimate lines that reuse a supplier quote linked to another work order', async () => {
    const cookies = await loginAsRole(app, 'ADMIN');
    const workOrderId = await createSaleWorkOrder(
      app,
      cookies,
      `estimate-locked-${Date.now()}`,
    );

    await request(app.getHttpServer())
      .put(`/work-orders/${workOrderId}/estimates/INITIAL`)
      .set('Cookie', cookies)
      .send({
        totalCostAmount: 182000,
        totalPriceAmount: 250000,
        lines: [
          {
            lineType: 'PART',
            description: 'Inyector Bosch bloqueado',
            quantity: 1,
            unitCost: 182000,
            unitPrice: 250000,
            supplierId: 'seed-supplier-repuestos-central-main',
            inventoryItemId: 'seed-inventory-item-bosch-inyector',
            supplierQuoteHistoryId: 'seed-supplier-quote-bosch-central-v2',
          },
        ],
      })
      .expect(400)
      .expect(({ body }: { body: { message: string | string[] } }) => {
        expect(body.message).toContain(
          `Supplier quote seed-supplier-quote-bosch-central-v2 does not belong to work order ${workOrderId}`,
        );
      });
  });

  it('creates, lists, updates, and removes actual costs without deleting the parent order', async () => {
    const cookies = await loginAsRole(app, 'ADMIN');
    const workOrderId = await createSaleWorkOrder(
      app,
      cookies,
      `cost-${Date.now()}`,
    );

    const createdResponse = await request(app.getHttpServer())
      .post(`/work-orders/${workOrderId}/actual-costs`)
      .set('Cookie', cookies)
      .send({
        category: WorkOrderCostCategory.DIRECT_PURCHASE,
        description: '  Compra urgente de inyector  ',
        amount: 182000,
        incurredAt: '2026-05-10T14:00:00.000Z',
        paymentMethod: PaymentMethod.TRANSFER,
        supplierId: 'seed-supplier-repuestos-central-main',
        inventoryItemId: 'seed-inventory-item-bosch-inyector',
        supplierQuoteHistoryId: 'seed-supplier-quote-bosch-central-v1',
      })
      .expect(201);
    const created = readBody<ActualCostResponse>(createdResponse);

    expect(created.category).toBe(WorkOrderCostCategory.DIRECT_PURCHASE);
    expect(created.description).toBe('Compra urgente de inyector');
    expect(created.supplierId).toBe('seed-supplier-repuestos-central-main');

    await request(app.getHttpServer())
      .get(`/work-orders/${workOrderId}/actual-costs`)
      .set('Cookie', cookies)
      .expect(200)
      .expect(({ body }: { body: ActualCostListResponse }) => {
        expect(body.data).toHaveLength(1);
        expect(body.data[0].id).toBe(created.id);
      });

    await request(app.getHttpServer())
      .patch(`/work-orders/${workOrderId}/actual-costs/${created.id}`)
      .set('Cookie', cookies)
      .send({
        description: '  Compra confirmada de inyector  ',
        amount: 180000,
      })
      .expect(200)
      .expect(({ body }: { body: ActualCostResponse }) => {
        expect(body.description).toBe('Compra confirmada de inyector');
        expect(body.amount).toBe(180000);
      });

    await request(app.getHttpServer())
      .delete(`/work-orders/${workOrderId}/actual-costs/${created.id}`)
      .set('Cookie', cookies)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/work-orders/${workOrderId}`)
      .set('Cookie', cookies)
      .expect(200)
      .expect(({ body }: { body: WorkOrderResponse }) => {
        expect(body.id).toBe(workOrderId);
        expect(body.actualCosts).toHaveLength(0);
      });
  });

  it('supports reserve, release, consume, and sell inventory actions with rollback and read-model traces', async () => {
    const cookies = await loginAsRole(app, 'ADMIN');
    const workOrderId = await createSaleWorkOrder(
      app,
      cookies,
      `inventory-${Date.now()}`,
    );
    const inventoryItemId = `test-inventory-item-${Date.now()}`;

    await prisma.inventoryItem.create({
      data: {
        id: inventoryItemId,
        name: 'Inyector Bosch e2e aislado',
        itemType: InventoryItemType.STOCK_OWNED,
        condition: InventoryCondition.NEW,
        brand: 'Bosch',
        reference: `E2E-${Date.now()}`,
        identifier: inventoryItemId,
        minimumStock: 0,
        defaultSalePrice: 250000,
        isActive: true,
        updatedAt: new Date('2026-05-11T09:50:00.000Z'),
      },
    });
    await prisma.inventoryMovement.create({
      data: {
        id: `test-inventory-movement-${Date.now()}`,
        inventoryItemId,
        movementType: InventoryMovementType.IN,
        reason: InventoryMovementReason.PURCHASE,
        quantity: 4,
        unitCost: 182000,
        supplierId: 'seed-supplier-repuestos-central-main',
        occurredAt: new Date('2026-05-11T09:50:00.000Z'),
        notes: 'Isolated stock for work-order inventory e2e.',
      },
    });

    const reserveResponse = await request(app.getHttpServer())
      .post(`/work-orders/${workOrderId}/inventory/reservations`)
      .set('Cookie', cookies)
      .send({
        inventoryItemId,
        quantity: 2,
        occurredAt: '2026-05-11T10:00:00.000Z',
        reason: 'WORK_ORDER_PURCHASE',
        supplierId: 'seed-supplier-repuestos-central-main',
      })
      .expect(201);

    expect(
      readBody<{ currentStockAfter: number }>(reserveResponse)
        .currentStockAfter,
    ).toBe(4);

    await request(app.getHttpServer())
      .post(`/work-orders/${workOrderId}/inventory/releases`)
      .set('Cookie', cookies)
      .send({
        inventoryItemId,
        quantity: 1,
        occurredAt: '2026-05-11T10:10:00.000Z',
        reason: 'RETURN',
      })
      .expect(201);

    const consumeResponse = await request(app.getHttpServer())
      .post(`/work-orders/${workOrderId}/inventory/consumptions`)
      .set('Cookie', cookies)
      .send({
        inventoryItemId,
        quantity: 1,
        occurredAt: '2026-05-11T10:20:00.000Z',
        reason: 'WORK_ORDER_CONSUMPTION',
        unitCost: 182000,
        actualCostPaymentMethod: 'TRANSFER',
      })
      .expect(201);

    expect(
      readBody<{ actualCost?: { amount: number } }>(consumeResponse).actualCost,
    ).toMatchObject({ amount: 182000 });

    await request(app.getHttpServer())
      .post(`/work-orders/${workOrderId}/inventory/sales`)
      .set('Cookie', cookies)
      .send({
        inventoryItemId,
        quantity: 1,
        occurredAt: '2026-05-11T10:30:00.000Z',
        reason: 'SALE',
        actualCostAmount: 182000,
        actualCostDescription: 'Venta directa de mostrador',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/work-orders/${workOrderId}/inventory/consumptions`)
      .set('Cookie', cookies)
      .send({
        inventoryItemId: 'seed-inventory-item-cotizable-tobera',
        quantity: 1,
        occurredAt: '2026-05-11T10:40:00.000Z',
        reason: 'WORK_ORDER_CONSUMPTION',
      })
      .expect(400)
      .expect(({ body }: { body: { message: string | string[] } }) => {
        expect(body.message).toContain(
          'Demand-purchased items do not allow physical stock movements',
        );
      });

    await request(app.getHttpServer())
      .post(`/work-orders/${workOrderId}/inventory/consumptions`)
      .set('Cookie', cookies)
      .send({
        inventoryItemId,
        quantity: 1,
        occurredAt: '2026-05-11T10:50:00.000Z',
        reason: 'WORK_ORDER_CONSUMPTION',
        actualCostAmount: 0,
      })
      .expect(400);

    await request(app.getHttpServer())
      .get(`/work-orders/${workOrderId}`)
      .set('Cookie', cookies)
      .expect(200)
      .expect(({ body }: { body: WorkOrderResponse }) => {
        const inventoryActivity = body.inventoryActivity.find(
          (item) => item.inventoryItemId === inventoryItemId,
        );

        expect(inventoryActivity).toBeDefined();
        expect(inventoryActivity).toMatchObject({
          activeReservedQuantity: 0,
          consumedQuantity: 1,
          soldQuantity: 1,
        });
        expect(inventoryActivity?.actualCostIds).toHaveLength(2);
        expect(
          inventoryActivity?.movements.map((movement) => movement.reason),
        ).toEqual(
          expect.arrayContaining([
            'WORK_ORDER_PURCHASE',
            'RETURN',
            'WORK_ORDER_CONSUMPTION',
            'SALE',
          ]),
        );
      });
  });

  it('derives payment status from payable totals across create, update, and delete payment flows', async () => {
    const cookies = await loginAsRole(app, 'SALES');
    const workOrderId = await createSaleWorkOrder(
      app,
      cookies,
      `payment-${Date.now()}`,
    );

    await request(app.getHttpServer())
      .put(`/work-orders/${workOrderId}/estimates/FINAL`)
      .set('Cookie', cookies)
      .send({
        totalCostAmount: 70000,
        totalPriceAmount: 100000,
        lines: [
          {
            lineType: 'SERVICE',
            description: 'Reparación integral',
            quantity: 1,
            unitCost: 70000,
            unitPrice: 100000,
            serviceCatalogId: 'seed-service-reparacion',
          },
        ],
      })
      .expect(200);

    const createdResponse = await request(app.getHttpServer())
      .post(`/work-orders/${workOrderId}/payments`)
      .set('Cookie', cookies)
      .send({
        amount: 50000,
        paidAt: '2026-05-10T18:00:00.000Z',
        paymentMethod: PaymentMethod.CASH,
        notes: '  Anticipo  ',
      })
      .expect(201);
    const partiallyPaid = readBody<WorkOrderResponse>(createdResponse);

    expect(partiallyPaid.paymentStatus).toBe(PaymentStatus.PARTIAL);
    expect(partiallyPaid.payments).toHaveLength(1);
    const paymentId = partiallyPaid.payments[0].id;

    const updatedResponse = await request(app.getHttpServer())
      .patch(`/work-orders/${workOrderId}/payments/${paymentId}`)
      .set('Cookie', cookies)
      .send({
        amount: 100000,
        paymentMethod: PaymentMethod.TRANSFER,
      })
      .expect(200);
    const paid = readBody<WorkOrderResponse>(updatedResponse);

    expect(paid.paymentStatus).toBe(PaymentStatus.PAID);
    expect(paid.payments[0].amount).toBe(100000);

    await request(app.getHttpServer())
      .delete(`/work-orders/${workOrderId}/payments/${paymentId}`)
      .set('Cookie', cookies)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/work-orders/${workOrderId}`)
      .set('Cookie', cookies)
      .expect(200)
      .expect(({ body }: { body: WorkOrderResponse }) => {
        expect(body.paymentStatus).toBe(PaymentStatus.PENDING);
        expect(body.payments).toHaveLength(0);
      });
  });
});

async function createSaleWorkOrder(
  app: INestApplication<App>,
  cookies: string[],
  runId: string,
) {
  const response = await request(app.getHttpServer())
    .post('/work-orders')
    .set('Cookie', cookies)
    .send({
      type: WorkOrderType.SALE,
      customerId: 'seed-customer-ana-gomez',
      summary: `  Orden ${runId}  `,
      assignedEmployeeId: 'seed-employee-mario-rincon',
    })
    .expect(201);

  return readBody<WorkOrderResponse>(response).id;
}

async function createWorkshopWorkOrder(
  app: INestApplication<App>,
  cookies: string[],
  runId: string,
) {
  const response = await request(app.getHttpServer())
    .post('/work-orders')
    .set('Cookie', cookies)
    .send({
      type: WorkOrderType.WORKSHOP,
      customerId: 'seed-customer-acme-industrial',
      vehicleId: 'seed-vehicle-acme-foton-aumark',
      componentId: 'seed-component-acme-inyector',
      assignedEmployeeId: 'seed-employee-mario-rincon',
      summary: `  Orden taller ${runId}  `,
      diagnosisRequired: true,
      customerReportedIssue: 'Ruido en banco',
    })
    .expect(201);

  return readBody<WorkOrderResponse>(response).id;
}

function readBody<T>(response: request.Response): T {
  return response.body as T;
}
