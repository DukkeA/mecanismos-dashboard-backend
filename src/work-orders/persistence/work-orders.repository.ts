import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  EstimatePhase,
  PaymentStatus,
  WorkOrderStatus,
  WorkOrderType,
} from '../../../generated/prisma/enums';
import type { CreateWorkOrderPaymentDto } from '../dto/create-work-order-payment.dto';
import type { Prisma } from '../../../generated/prisma/client';
import type { CreateWorkOrderActualCostDto } from '../dto/create-work-order-actual-cost.dto';
import type { CreateWorkOrderDto } from '../dto/create-work-order.dto';
import type { ListWorkOrdersQueryDto } from '../dto/list-work-orders-query.dto';
import type { UpsertWorkOrderEstimateDto } from '../dto/upsert-work-order-estimate.dto';
import type { UpdateWorkOrderActualCostDto } from '../dto/update-work-order-actual-cost.dto';
import type { UpdateWorkOrderPaymentDto } from '../dto/update-work-order-payment.dto';
import type { UpdateWorkOrderDto } from '../dto/update-work-order.dto';

export const WORK_ORDERS_PRISMA_CLIENT = Symbol('WORK_ORDERS_PRISMA_CLIENT');

export type WorkOrderCustomerSummary = {
  id: string;
  name?: string | null;
  phone?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  email?: string | null;
};

export type WorkOrderVehicleSummary = {
  id: string;
  customerId: string;
  brand?: string | null;
  modelReference?: string | null;
  plate?: string | null;
};

export type WorkOrderComponentSummary = {
  id: string;
  customerId: string;
  vehicleId?: string | null;
  brand?: string | null;
  reference?: string | null;
  identifier?: string | null;
};

export type WorkOrderEmployeeSummary = {
  id: string;
  name?: string | null;
  type?: string | null;
  isActive?: boolean | null;
};

export type WorkOrderEstimateSummary = {
  id: string;
  phase: string;
  totalCostAmount: number;
  totalPriceAmount: number;
  notes: string | null;
};

export type WorkOrderEstimateLineInventorySummary = {
  id: string;
  name?: string | null;
  reference?: string | null;
  identifier?: string | null;
  defaultSalePrice?: number | null;
  isActive?: boolean | null;
};

export type WorkOrderEstimateLineServiceCatalogSummary = {
  id: string;
  name?: string | null;
  slug?: string | null;
  isActive?: boolean | null;
};

export type WorkOrderEstimateLineSupplierSummary = {
  id: string;
  name?: string | null;
  type?: string | null;
  isActive?: boolean | null;
};

export type WorkOrderEstimateLineSupplierQuoteSummary = {
  id: string;
  supplierId: string;
  inventoryItemId: string;
  workOrderId: string | null;
  quotedCost: number;
  quotedAt: Date;
  status: string;
  supplier: WorkOrderEstimateLineSupplierSummary | null;
  inventoryItem: WorkOrderEstimateLineInventorySummary | null;
};

export type WorkOrderEstimateLineDetail = {
  id: string;
  lineType: string;
  description: string;
  inventoryItemId: string | null;
  serviceCatalogId: string | null;
  supplierId: string | null;
  supplierQuoteHistoryId: string | null;
  quantity: number;
  unitCost: number | null;
  unitPrice: number | null;
  notes: string | null;
  inventoryItem: WorkOrderEstimateLineInventorySummary | null;
  serviceCatalog: WorkOrderEstimateLineServiceCatalogSummary | null;
  supplier: WorkOrderEstimateLineSupplierSummary | null;
  supplierQuoteHistory: WorkOrderEstimateLineSupplierQuoteSummary | null;
};

export type WorkOrderEstimateDetail = {
  id: string;
  workOrderId: string;
  phase: string;
  estimatedLaborHours: number | null;
  baseCostAmount: number;
  contingencyPct: number | null;
  contingencyAmount: number;
  totalCostAmount: number;
  totalPriceAmount: number;
  notes: string | null;
  lines: WorkOrderEstimateLineDetail[];
};

export type WorkOrderSupplierSummary = {
  id: string;
  name: string;
  isActive: boolean;
  type?: string | null;
};

export type WorkOrderInventoryItemSummary = {
  id: string;
  name: string;
  sku: string | null;
  reference?: string | null;
  identifier?: string | null;
  defaultSalePrice?: number | null;
  isActive?: boolean | null;
};

export type WorkOrderSupplierQuoteSummary = {
  id: string;
  supplierId: string;
  inventoryItemId: string;
  workOrderId: string | null;
  quotedCost: number;
  quotedAt: Date;
  status: string;
  supplier: WorkOrderSupplierSummary | null;
  inventoryItem: WorkOrderInventoryItemSummary | null;
};

export type WorkOrderActualCostSummary = {
  id: string;
  category: string;
  description: string;
  amount: number;
  supplierId: string | null;
  inventoryItemId: string | null;
  supplierQuoteHistoryId: string | null;
  paymentMethod: string | null;
  incurredAt: Date;
  notes: string | null;
  supplier: WorkOrderSupplierSummary | null;
  inventoryItem: WorkOrderInventoryItemSummary | null;
  supplierQuoteHistory: WorkOrderSupplierQuoteSummary | null;
};

export type WorkOrderPaymentSummary = {
  id: string;
  amount: number;
  paymentMethod: string | null;
  paidAt: Date;
  notes: string | null;
};

export type WorkOrderDetail = {
  id: string;
  number: number;
  type: string;
  status: string;
  paymentStatus: string;
  customerId: string;
  vehicleId: string | null;
  componentId: string | null;
  assignedEmployeeId: string | null;
  summary: string;
  externalLink: string | null;
  notes: string | null;
  estimatedCompletionAt: Date | null;
  estimatedCollectionAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer: WorkOrderCustomerSummary | null;
  vehicle: WorkOrderVehicleSummary | null;
  component: WorkOrderComponentSummary | null;
  assignedEmployee: WorkOrderEmployeeSummary | null;
  workshopDetails: {
    id: string;
    customerReportedIssue: string | null;
    diagnosisRequired: boolean;
    diagnosisSummary: string | null;
  } | null;
  estimates: WorkOrderEstimateSummary[];
  actualCosts: WorkOrderActualCostSummary[];
  payments: WorkOrderPaymentSummary[];
};

export type WorkOrdersListResult = {
  items: WorkOrderDetail[];
  total: number;
  page: number;
  limit: number;
};

type WorkOrderWhereInput = Prisma.WorkOrderWhereInput;

type WorkOrdersPrismaClient = {
  $transaction?<T>(
    callback: (transaction: WorkOrdersPrismaTransactionClient) => Promise<T>,
  ): Promise<T>;
  customer: {
    findUnique(args: {
      where: { id: string };
      select: {
        id: true;
        name: true;
        phone: true;
        documentType: true;
        documentNumber: true;
        email: true;
      };
    }): Promise<WorkOrderCustomerSummary | null>;
  };
  vehicle: {
    findUnique(args: {
      where: { id: string };
      select: {
        id: true;
        customerId: true;
        brand: true;
        modelReference: true;
        plate: true;
      };
    }): Promise<WorkOrderVehicleSummary | null>;
  };
  component: {
    findUnique(args: {
      where: { id: string };
      select: {
        id: true;
        customerId: true;
        vehicleId: true;
        brand: true;
        reference: true;
        identifier: true;
      };
    }): Promise<WorkOrderComponentSummary | null>;
  };
  employee: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; name: true; type: true; isActive: true };
    }): Promise<WorkOrderEmployeeSummary | null>;
  };
  inventoryItem: {
    findUnique(args: {
      where: { id: string };
      select: {
        id: true;
        name: true;
        reference: true;
        identifier: true;
        defaultSalePrice: true;
        isActive: true;
      };
    }): Promise<{
      id: string;
      name: string;
      reference: string | null;
      identifier: string | null;
      defaultSalePrice: number | null;
      isActive: boolean | null;
    } | null>;
  };
  serviceCatalog: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; name: true; slug: true; isActive: true };
    }): Promise<WorkOrderEstimateLineServiceCatalogSummary | null>;
  };
  supplier: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; name: true; type: true; isActive: true };
    }): Promise<WorkOrderSupplierSummary | null>;
  };
  supplierQuoteHistory: {
    findUnique(args: {
      where: { id: string };
      select: {
        id: true;
        supplierId: true;
        inventoryItemId: true;
        workOrderId: true;
        quotedCost: true;
        quotedAt: true;
        status: true;
        Supplier: {
          select: { id: true; name: true; type: true; isActive: true };
        };
        InventoryItem: {
          select: {
            id: true;
            name: true;
            reference: true;
            identifier: true;
            defaultSalePrice: true;
            isActive: true;
          };
        };
      };
    }): Promise<{
      id: string;
      supplierId: string;
      inventoryItemId: string;
      workOrderId: string | null;
      quotedCost: number;
      quotedAt: Date;
      status: string;
      Supplier: WorkOrderSupplierSummary | null;
      InventoryItem: {
        id: string;
        name: string;
        reference: string | null;
        identifier: string | null;
        defaultSalePrice: number | null;
        isActive: boolean | null;
      } | null;
    } | null>;
  };
  workOrder: {
    create(args: {
      data: Record<string, unknown>;
      include: typeof workOrderDetailInclude;
    }): Promise<WorkOrderRecord>;
    findMany(args: {
      where: WorkOrderWhereInput;
      orderBy: { number: 'desc' };
      skip: number;
      take: number;
      include: typeof workOrderDetailInclude;
    }): Promise<WorkOrderRecord[]>;
    count(args: { where: WorkOrderWhereInput }): Promise<number>;
    findUnique(args: {
      where: { id: string };
      include: typeof workOrderDetailInclude;
    }): Promise<WorkOrderRecord | null>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      include: typeof workOrderDetailInclude;
    }): Promise<WorkOrderRecord>;
  };
  workOrderEstimate?: {
    upsert(args: {
      where: {
        workOrderId_phase: { workOrderId: string; phase: EstimatePhase };
      };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<{ id: string }>;
    findUnique(args: {
      where: {
        workOrderId_phase: { workOrderId: string; phase: EstimatePhase };
      };
      include: typeof estimateDetailInclude;
    }): Promise<WorkOrderEstimateRecord | null>;
    findMany(args: {
      where: { workOrderId: string };
      orderBy: { createdAt: 'asc' };
      include: typeof estimateDetailInclude;
    }): Promise<WorkOrderEstimateRecord[]>;
  };
  workOrderEstimateLine?: {
    deleteMany(args: { where: { estimateId: string } }): Promise<unknown>;
    createMany(args: { data: Record<string, unknown>[] }): Promise<unknown>;
  };
  workOrderActualCost?: {
    create(args: {
      data: Record<string, unknown>;
      include: typeof actualCostInclude;
    }): Promise<ActualCostRecord>;
    findMany(args: {
      where: { workOrderId: string };
      orderBy: { incurredAt: 'desc' };
      include: typeof actualCostInclude;
    }): Promise<ActualCostRecord[]>;
    findFirst(args: {
      where: { id: string; workOrderId: string };
      include: typeof actualCostInclude;
    }): Promise<ActualCostRecord | null>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      include: typeof actualCostInclude;
    }): Promise<ActualCostRecord>;
    delete(args: { where: { id: string } }): Promise<unknown>;
  };
  workshopWorkOrderDetails?: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
    upsert(args: {
      where: { workOrderId: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<unknown>;
    deleteMany(args: { where: { workOrderId: string } }): Promise<unknown>;
  };
  workOrderPayment?: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<unknown>;
    delete(args: { where: { id: string } }): Promise<unknown>;
  };
};

type WorkOrdersPrismaTransactionClient = Pick<
  WorkOrdersPrismaClient,
  | 'workOrder'
  | 'workOrderEstimate'
  | 'workOrderEstimateLine'
  | 'workshopWorkOrderDetails'
  | 'workOrderPayment'
>;

type DecimalValue = number | string | { toNumber(): number } | null;

type WorkOrderEstimateRecord = {
  id: string;
  workOrderId: string;
  phase: string;
  estimatedLaborHours: DecimalValue;
  baseCostAmount: number;
  contingencyPct: number | null;
  contingencyAmount: number;
  totalCostAmount: number;
  totalPriceAmount: number;
  notes: string | null;
  WorkOrderEstimateLine: WorkOrderEstimateLineRecord[];
};

type WorkOrderEstimateLineRecord = {
  id: string;
  lineType: string;
  description: string;
  inventoryItemId: string | null;
  serviceCatalogId: string | null;
  supplierId: string | null;
  supplierQuoteHistoryId: string | null;
  quantity: number;
  unitCost: number | null;
  unitPrice: number | null;
  notes: string | null;
  InventoryItem: WorkOrderEstimateLineInventorySummary | null;
  ServiceCatalog: WorkOrderEstimateLineServiceCatalogSummary | null;
  Supplier: WorkOrderEstimateLineSupplierSummary | null;
  SupplierQuoteHistory: {
    id: string;
    supplierId: string;
    inventoryItemId: string;
    workOrderId: string | null;
    quotedCost: number;
    quotedAt: Date;
    status: string;
    Supplier: WorkOrderEstimateLineSupplierSummary | null;
    InventoryItem: WorkOrderEstimateLineInventorySummary | null;
  } | null;
};

type ActualCostRecord = {
  id: string;
  category: string;
  description: string;
  amount: number;
  supplierId: string | null;
  inventoryItemId: string | null;
  supplierQuoteHistoryId: string | null;
  paymentMethod: string | null;
  incurredAt: Date;
  notes: string | null;
  Supplier: WorkOrderSupplierSummary | null;
  InventoryItem: {
    id: string;
    name: string;
    reference: string | null;
    identifier: string | null;
    defaultSalePrice: number | null;
    isActive: boolean | null;
  } | null;
  SupplierQuoteHistory: {
    id: string;
    supplierId: string;
    inventoryItemId: string;
    workOrderId: string | null;
    quotedCost: number;
    quotedAt: Date;
    status: string;
    Supplier: WorkOrderSupplierSummary | null;
    InventoryItem: {
      id: string;
      name: string;
      reference: string | null;
      identifier: string | null;
      defaultSalePrice: number | null;
      isActive: boolean | null;
    } | null;
  } | null;
};

type WorkOrderRecord = {
  id: string;
  number: number;
  type: string;
  status: string;
  paymentStatus: string;
  customerId: string;
  vehicleId: string | null;
  componentId: string | null;
  assignedEmployeeId: string | null;
  summary: string;
  externalLink: string | null;
  notes: Prisma.JsonValue | null;
  estimatedCompletionAt: Date | null;
  estimatedCollectionAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  Customer: WorkOrderCustomerSummary | null;
  Vehicle: WorkOrderVehicleSummary | null;
  Component: WorkOrderComponentSummary | null;
  Employee: WorkOrderEmployeeSummary | null;
  WorkshopWorkOrderDetails: {
    id: string;
    customerReportedIssue: string | null;
    diagnosisRequired: boolean;
    diagnosisSummary: string | null;
  } | null;
  WorkOrderEstimate: Array<{
    id: string;
    phase: string;
    totalCostAmount: number;
    totalPriceAmount: number;
    notes: string | null;
  }>;
  WorkOrderActualCost: Array<{
    id: string;
    category: string;
    description: string;
    amount: number;
    supplierId: string | null;
    inventoryItemId: string | null;
    supplierQuoteHistoryId: string | null;
    paymentMethod: string | null;
    incurredAt: Date;
    notes: string | null;
    Supplier: WorkOrderSupplierSummary | null;
    InventoryItem: {
      id: string;
      name: string;
      reference: string | null;
      identifier: string | null;
      defaultSalePrice: number | null;
      isActive: boolean | null;
    } | null;
    SupplierQuoteHistory: ActualCostRecord['SupplierQuoteHistory'];
  }>;
  WorkOrderPayment: Array<{
    id: string;
    amount: number;
    paymentMethod: string | null;
    paidAt: Date;
    notes: string | null;
  }>;
};

const actualCostInclude = {
  Supplier: {
    select: { id: true, name: true, type: true, isActive: true },
  },
  InventoryItem: {
    select: {
      id: true,
      name: true,
      reference: true,
      identifier: true,
      defaultSalePrice: true,
      isActive: true,
    },
  },
  SupplierQuoteHistory: {
    select: {
      id: true,
      supplierId: true,
      inventoryItemId: true,
      workOrderId: true,
      quotedCost: true,
      quotedAt: true,
      status: true,
      Supplier: {
        select: { id: true, name: true, type: true, isActive: true },
      },
      InventoryItem: {
        select: {
          id: true,
          name: true,
          reference: true,
          identifier: true,
          defaultSalePrice: true,
          isActive: true,
        },
      },
    },
  },
} as const;

const workOrderDetailInclude = {
  Customer: true,
  Vehicle: true,
  Component: true,
  Employee: true,
  WorkshopWorkOrderDetails: true,
  WorkOrderEstimate: {
    orderBy: { createdAt: 'asc' as const },
  },
  WorkOrderActualCost: {
    orderBy: { incurredAt: 'desc' as const },
    include: actualCostInclude,
  },
  WorkOrderPayment: {
    orderBy: { paidAt: 'desc' as const },
  },
} as const;

const estimateDetailInclude = {
  WorkOrderEstimateLine: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      InventoryItem: true,
      ServiceCatalog: true,
      Supplier: true,
      SupplierQuoteHistory: {
        include: {
          Supplier: true,
          InventoryItem: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class WorkOrdersRepository {
  constructor(
    @Inject(WORK_ORDERS_PRISMA_CLIENT)
    readonly prisma: WorkOrdersPrismaClient,
  ) {}

  create(input: CreateWorkOrderDto) {
    const workshopDetails = buildWorkshopDetailsPayload(input);

    if (
      input.type === WorkOrderType.WORKSHOP &&
      workshopDetails !== null &&
      this.prisma.$transaction
    ) {
      return this.prisma.$transaction(async (tx) => {
        const workOrder = await tx.workOrder.create({
          data: buildWorkOrderCreateData(input),
          include: workOrderDetailInclude,
        });

        await tx.workshopWorkOrderDetails!.create({
          data: {
            id: randomUUID(),
            workOrderId: workOrder.id,
            ...workshopDetails,
          },
        });

        const persisted = await tx.workOrder.findUnique({
          where: { id: workOrder.id },
          include: workOrderDetailInclude,
        });

        return mapWorkOrderRecord(persisted ?? workOrder);
      });
    }

    return this.prisma.workOrder
      .create({
        data: buildWorkOrderCreateData(input),
        include: workOrderDetailInclude,
      })
      .then(mapWorkOrderRecord);
  }

  async findMany(query: ListWorkOrdersQueryDto): Promise<WorkOrdersListResult> {
    const where = buildWorkOrderWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        orderBy: { number: 'desc' },
        skip,
        take: query.limit,
        include: workOrderDetailInclude,
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return {
      items: items.map(mapWorkOrderRecord),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findById(id: string) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id },
      include: workOrderDetailInclude,
    });

    return workOrder ? mapWorkOrderRecord(workOrder) : null;
  }

  update(id: string, input: UpdateWorkOrderDto, currentType?: string) {
    const resolvedType = input.type ?? currentType;
    const workshopDetails = buildWorkshopDetailsPayload(input);

    if (
      this.prisma.$transaction &&
      (resolvedType === WorkOrderType.SALE ||
        (resolvedType === WorkOrderType.WORKSHOP && workshopDetails !== null))
    ) {
      return this.prisma.$transaction(async (tx) => {
        const workOrder = await tx.workOrder.update({
          where: { id },
          data: buildWorkOrderUpdateData(input),
          include: workOrderDetailInclude,
        });

        if (resolvedType === WorkOrderType.SALE) {
          await tx.workshopWorkOrderDetails!.deleteMany({
            where: { workOrderId: id },
          });
        } else if (workshopDetails !== null) {
          await tx.workshopWorkOrderDetails!.upsert({
            where: { workOrderId: id },
            create: {
              id: randomUUID(),
              workOrderId: id,
              ...workshopDetails,
            },
            update: workshopDetails,
          });
        }

        const persisted = await tx.workOrder.findUnique({
          where: { id },
          include: workOrderDetailInclude,
        });

        return mapWorkOrderRecord(persisted ?? workOrder);
      });
    }

    return this.prisma.workOrder
      .update({
        where: { id },
        data: buildWorkOrderUpdateData(input),
        include: workOrderDetailInclude,
      })
      .then(mapWorkOrderRecord);
  }

  async upsertEstimate(
    workOrderId: string,
    phase: EstimatePhase,
    input: UpsertWorkOrderEstimateDto,
  ) {
    if (!this.prisma.$transaction) {
      throw new Error(
        'Estimate persistence requires transactional Prisma delegates',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (!tx.workOrderEstimate || !tx.workOrderEstimateLine) {
        throw new Error(
          'Estimate persistence requires estimate Prisma delegates',
        );
      }

      const estimate = await tx.workOrderEstimate.upsert({
        where: {
          workOrderId_phase: {
            workOrderId,
            phase,
          },
        },
        create: buildEstimateCreatePayload(workOrderId, phase, input),
        update: buildEstimateUpdatePayload(workOrderId, phase, input),
      });

      await tx.workOrderEstimateLine.deleteMany({
        where: { estimateId: estimate.id },
      });

      const lines = buildEstimateLineCreateManyData(estimate.id, input.lines);

      if (lines.length > 0) {
        await tx.workOrderEstimateLine.createMany({ data: lines });
      }

      const persisted = await tx.workOrderEstimate.findUnique({
        where: {
          workOrderId_phase: {
            workOrderId,
            phase,
          },
        },
        include: estimateDetailInclude,
      });

      return mapEstimateRecord(
        persisted ?? {
          id: estimate.id,
          workOrderId,
          phase,
          estimatedLaborHours: input.estimatedLaborHours ?? null,
          baseCostAmount: input.baseCostAmount ?? 0,
          contingencyPct: input.contingencyPct ?? null,
          contingencyAmount: deriveContingencyAmount(input),
          totalCostAmount: input.totalCostAmount ?? 0,
          totalPriceAmount: input.totalPriceAmount ?? 0,
          notes: normalizeOptionalString(input.notes),
          WorkOrderEstimateLine: [],
        },
      );
    });
  }

  async findEstimatesByWorkOrderId(workOrderId: string) {
    if (!this.prisma.workOrderEstimate) {
      return [];
    }

    const estimates = await this.prisma.workOrderEstimate.findMany({
      where: { workOrderId },
      orderBy: { createdAt: 'asc' },
      include: estimateDetailInclude,
    });

    return estimates.map(mapEstimateRecord);
  }

  createActualCost(workOrderId: string, input: CreateWorkOrderActualCostDto) {
    return this.prisma
      .workOrderActualCost!.create({
        data: buildActualCostCreateData(workOrderId, input),
        include: actualCostInclude,
      })
      .then(mapActualCostRecord);
  }

  findActualCosts(workOrderId: string) {
    return this.prisma
      .workOrderActualCost!.findMany({
        where: { workOrderId },
        orderBy: { incurredAt: 'desc' },
        include: actualCostInclude,
      })
      .then((records) => records.map(mapActualCostRecord));
  }

  findActualCostById(workOrderId: string, costId: string) {
    return this.prisma
      .workOrderActualCost!.findFirst({
        where: { id: costId, workOrderId },
        include: actualCostInclude,
      })
      .then((record) => (record ? mapActualCostRecord(record) : null));
  }

  updateActualCost(
    _workOrderId: string,
    costId: string,
    input: UpdateWorkOrderActualCostDto,
  ) {
    return this.prisma
      .workOrderActualCost!.update({
        where: { id: costId },
        data: buildActualCostUpdateData(input),
        include: actualCostInclude,
      })
      .then(mapActualCostRecord);
  }

  async removeActualCost(_workOrderId: string, costId: string) {
    await this.prisma.workOrderActualCost!.delete({
      where: { id: costId },
    });
  }

  createPayment(
    id: string,
    input: CreateWorkOrderPaymentDto,
    currentWorkOrder: WorkOrderDetail,
  ) {
    return this.runPaymentMutation(
      id,
      currentWorkOrder,
      async (tx) => {
        await tx.workOrderPayment!.create({
          data: buildCreatePaymentData(id, input),
        });
      },
      [...currentWorkOrder.payments, buildCreatedPaymentSummary(input)],
    );
  }

  updatePayment(
    id: string,
    paymentId: string,
    input: UpdateWorkOrderPaymentDto,
    currentWorkOrder: WorkOrderDetail,
  ) {
    return this.runPaymentMutation(
      id,
      currentWorkOrder,
      async (tx) => {
        await tx.workOrderPayment!.update({
          where: { id: paymentId },
          data: buildUpdatePaymentData(input),
        });
      },
      currentWorkOrder.payments.map((payment) =>
        payment.id === paymentId
          ? {
              ...payment,
              ...buildUpdatedPaymentSummary(payment, input),
            }
          : payment,
      ),
    );
  }

  removePayment(
    id: string,
    paymentId: string,
    currentWorkOrder: WorkOrderDetail,
  ) {
    return this.runPaymentMutation(
      id,
      currentWorkOrder,
      async (tx) => {
        await tx.workOrderPayment!.delete({
          where: { id: paymentId },
        });
      },
      currentWorkOrder.payments.filter((payment) => payment.id !== paymentId),
    );
  }

  findCustomerById(id: string) {
    return this.prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        documentType: true,
        documentNumber: true,
        email: true,
      },
    });
  }

  findVehicleById(id: string) {
    return this.prisma.vehicle.findUnique({
      where: { id },
      select: {
        id: true,
        customerId: true,
        brand: true,
        modelReference: true,
        plate: true,
      },
    });
  }

  findComponentById(id: string) {
    return this.prisma.component.findUnique({
      where: { id },
      select: {
        id: true,
        customerId: true,
        vehicleId: true,
        brand: true,
        reference: true,
        identifier: true,
      },
    });
  }

  findEmployeeById(id: string) {
    return this.prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
      },
    });
  }

  findInventoryItemById(id: string) {
    return this.prisma.inventoryItem.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        reference: true,
        identifier: true,
        defaultSalePrice: true,
        isActive: true,
      },
    });
  }

  findServiceCatalogById(id: string) {
    return this.prisma.serviceCatalog.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
      },
    });
  }

  findSupplierById(id: string) {
    return this.prisma.supplier.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
      },
    });
  }

  async findSupplierQuoteHistoryById(id: string) {
    const quote = await this.prisma.supplierQuoteHistory.findUnique({
      where: { id },
      select: {
        id: true,
        supplierId: true,
        inventoryItemId: true,
        workOrderId: true,
        quotedCost: true,
        quotedAt: true,
        status: true,
        Supplier: {
          select: {
            id: true,
            name: true,
            type: true,
            isActive: true,
          },
        },
        InventoryItem: {
          select: {
            id: true,
            name: true,
            reference: true,
            identifier: true,
            defaultSalePrice: true,
            isActive: true,
          },
        },
      },
    });

    return quote
      ? {
          id: quote.id,
          supplierId: quote.supplierId,
          inventoryItemId: quote.inventoryItemId,
          workOrderId: quote.workOrderId,
          quotedCost: quote.quotedCost,
          quotedAt: quote.quotedAt,
          status: quote.status,
          supplier: quote.Supplier,
          inventoryItem: quote.InventoryItem,
        }
      : null;
  }

  private async runPaymentMutation(
    id: string,
    currentWorkOrder: WorkOrderDetail,
    mutatePayment: (tx: WorkOrdersPrismaTransactionClient) => Promise<void>,
    nextPayments: WorkOrderPaymentSummary[],
  ) {
    if (!this.prisma.$transaction) {
      throw new Error(
        'WorkOrdersRepository payment mutations require transactions',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await mutatePayment(tx);

      const paymentStatus = resolvePaymentStatus(
        currentWorkOrder.paymentStatus,
        currentWorkOrder.estimates,
        nextPayments,
      );

      const workOrder = await tx.workOrder.update({
        where: { id },
        data: {
          paymentStatus,
          updatedAt: new Date(),
        },
        include: workOrderDetailInclude,
      });

      return mapWorkOrderRecord(workOrder);
    });
  }
}

function buildWorkOrderWhere(
  query: ListWorkOrdersQueryDto,
): WorkOrderWhereInput {
  const search = query.search?.trim();
  const numericSearch = search && /^\d+$/.test(search) ? Number(search) : null;

  return {
    ...(query.type !== undefined ? { type: query.type } : {}),
    ...(query.status !== undefined ? { status: query.status } : {}),
    ...(query.paymentStatus !== undefined
      ? { paymentStatus: query.paymentStatus }
      : {}),
    ...(query.customerId ? { customerId: query.customerId.trim() } : {}),
    ...(query.vehicleId ? { vehicleId: query.vehicleId.trim() } : {}),
    ...(query.componentId ? { componentId: query.componentId.trim() } : {}),
    ...(query.assignedEmployeeId
      ? { assignedEmployeeId: query.assignedEmployeeId.trim() }
      : {}),
    ...buildDateWindow(
      'estimatedCompletionAt',
      query.estimatedCompletionFrom,
      query.estimatedCompletionTo,
    ),
    ...buildDateWindow(
      'estimatedCollectionAt',
      query.estimatedCollectionFrom,
      query.estimatedCollectionTo,
    ),
    ...buildDateWindow('completedAt', query.completedFrom, query.completedTo),
    ...(search
      ? {
          OR: [
            ...(numericSearch !== null ? [{ number: numericSearch }] : []),
            { summary: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}

function buildWorkOrderCreateData(input: CreateWorkOrderDto) {
  return {
    id: randomUUID(),
    type: input.type,
    customerId: input.customerId.trim(),
    vehicleId: normalizeOptionalForeignKey(input.vehicleId),
    componentId: normalizeOptionalForeignKey(input.componentId),
    assignedEmployeeId: normalizeOptionalForeignKey(input.assignedEmployeeId),
    summary: input.summary.trim(),
    externalLink: normalizeOptionalString(input.externalLink),
    notes: normalizeOptionalString(input.notes),
    estimatedCompletionAt: input.estimatedCompletionAt ?? null,
    estimatedCollectionAt: input.estimatedCollectionAt ?? null,
    completedAt: input.completedAt ?? null,
    status: input.status ?? WorkOrderStatus.IN_PROGRESS,
    paymentStatus: input.paymentStatus ?? PaymentStatus.PENDING,
    updatedAt: new Date(),
  };
}

function buildWorkOrderUpdateData(input: UpdateWorkOrderDto) {
  return {
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.customerId !== undefined
      ? { customerId: input.customerId.trim() }
      : {}),
    ...(input.vehicleId !== undefined
      ? { vehicleId: normalizeOptionalForeignKey(input.vehicleId) }
      : {}),
    ...(input.componentId !== undefined
      ? { componentId: normalizeOptionalForeignKey(input.componentId) }
      : {}),
    ...(input.assignedEmployeeId !== undefined
      ? {
          assignedEmployeeId: normalizeOptionalForeignKey(
            input.assignedEmployeeId,
          ),
        }
      : {}),
    ...(input.summary !== undefined ? { summary: input.summary.trim() } : {}),
    ...(input.externalLink !== undefined
      ? { externalLink: normalizeOptionalString(input.externalLink) }
      : {}),
    ...(input.notes !== undefined
      ? { notes: normalizeOptionalString(input.notes) }
      : {}),
    ...(input.estimatedCompletionAt !== undefined
      ? { estimatedCompletionAt: input.estimatedCompletionAt }
      : {}),
    ...(input.estimatedCollectionAt !== undefined
      ? { estimatedCollectionAt: input.estimatedCollectionAt }
      : {}),
    ...(input.completedAt !== undefined
      ? { completedAt: input.completedAt }
      : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.paymentStatus !== undefined
      ? { paymentStatus: input.paymentStatus }
      : {}),
    updatedAt: new Date(),
  };
}

function buildWorkshopDetailsPayload(
  input: Pick<
    CreateWorkOrderDto,
    'customerReportedIssue' | 'diagnosisRequired' | 'diagnosisSummary'
  >,
) {
  const customerReportedIssue = normalizeOptionalString(
    input.customerReportedIssue,
  );
  const diagnosisSummary = normalizeOptionalString(input.diagnosisSummary);

  if (
    customerReportedIssue === null &&
    diagnosisSummary === null &&
    input.diagnosisRequired === undefined
  ) {
    return null;
  }

  return {
    customerReportedIssue,
    diagnosisRequired: input.diagnosisRequired ?? false,
    diagnosisSummary,
  };
}

function buildCreatePaymentData(
  workOrderId: string,
  input: CreateWorkOrderPaymentDto,
) {
  return {
    id: randomUUID(),
    workOrderId,
    amount: input.amount,
    paymentMethod: input.paymentMethod ?? null,
    paidAt: input.paidAt,
    notes: normalizeOptionalString(input.notes),
    updatedAt: new Date(),
  };
}

function buildActualCostCreateData(
  workOrderId: string,
  input: CreateWorkOrderActualCostDto,
) {
  return {
    id: randomUUID(),
    workOrderId,
    category: input.category,
    description: input.description.trim(),
    amount: input.amount,
    supplierId: normalizeOptionalForeignKey(input.supplierId),
    inventoryItemId: normalizeOptionalForeignKey(input.inventoryItemId),
    supplierQuoteHistoryId: normalizeOptionalForeignKey(
      input.supplierQuoteHistoryId,
    ),
    paymentMethod: input.paymentMethod ?? null,
    incurredAt: input.incurredAt,
    notes: normalizeOptionalString(input.notes),
    updatedAt: new Date(),
  };
}

function buildEstimateCreatePayload(
  workOrderId: string,
  phase: EstimatePhase,
  input: UpsertWorkOrderEstimateDto,
) {
  return {
    id: randomUUID(),
    workOrderId,
    phase,
    estimatedLaborHours: input.estimatedLaborHours ?? null,
    baseCostAmount: input.baseCostAmount ?? 0,
    contingencyPct: input.contingencyPct ?? null,
    contingencyAmount: deriveContingencyAmount(input),
    totalCostAmount: input.totalCostAmount ?? 0,
    totalPriceAmount: input.totalPriceAmount ?? 0,
    notes: normalizeOptionalString(input.notes),
    updatedAt: new Date(),
  };
}

function buildEstimateUpdatePayload(
  workOrderId: string,
  phase: EstimatePhase,
  input: UpsertWorkOrderEstimateDto,
) {
  const createPayload = buildEstimateCreatePayload(workOrderId, phase, input);
  const { id, ...payload } = createPayload;
  void id;

  return payload;
}

function buildEstimateLineCreateManyData(
  estimateId: string,
  lines: UpsertWorkOrderEstimateDto['lines'],
) {
  return (lines ?? []).map((line) => ({
    id: randomUUID(),
    estimateId,
    lineType: line.lineType,
    description: line.description.trim(),
    inventoryItemId: normalizeOptionalForeignKey(line.inventoryItemId),
    serviceCatalogId: normalizeOptionalForeignKey(line.serviceCatalogId),
    supplierId: normalizeOptionalForeignKey(line.supplierId),
    supplierQuoteHistoryId: normalizeOptionalForeignKey(
      line.supplierQuoteHistoryId,
    ),
    quantity: line.quantity ?? 1,
    unitCost: line.unitCost ?? null,
    unitPrice: line.unitPrice ?? null,
    notes: normalizeOptionalString(line.notes),
    updatedAt: new Date(),
  }));
}

function deriveContingencyAmount(input: UpsertWorkOrderEstimateDto) {
  const totalCostAmount = input.totalCostAmount ?? 0;
  const baseCostAmount = input.baseCostAmount ?? 0;

  return Math.max(totalCostAmount - baseCostAmount, 0);
}

function buildActualCostUpdateData(input: UpdateWorkOrderActualCostDto) {
  return {
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.description !== undefined
      ? { description: input.description.trim() }
      : {}),
    ...(input.amount !== undefined ? { amount: input.amount } : {}),
    ...(input.supplierId !== undefined
      ? { supplierId: normalizeOptionalForeignKey(input.supplierId) }
      : {}),
    ...(input.inventoryItemId !== undefined
      ? { inventoryItemId: normalizeOptionalForeignKey(input.inventoryItemId) }
      : {}),
    ...(input.supplierQuoteHistoryId !== undefined
      ? {
          supplierQuoteHistoryId: normalizeOptionalForeignKey(
            input.supplierQuoteHistoryId,
          ),
        }
      : {}),
    ...(input.paymentMethod !== undefined
      ? { paymentMethod: input.paymentMethod ?? null }
      : {}),
    ...(input.incurredAt !== undefined ? { incurredAt: input.incurredAt } : {}),
    ...(input.notes !== undefined
      ? { notes: normalizeOptionalString(input.notes) }
      : {}),
    updatedAt: new Date(),
  };
}

function buildUpdatePaymentData(input: UpdateWorkOrderPaymentDto) {
  return {
    ...(input.amount !== undefined ? { amount: input.amount } : {}),
    ...(input.paymentMethod !== undefined
      ? { paymentMethod: input.paymentMethod }
      : {}),
    ...(input.paidAt !== undefined ? { paidAt: input.paidAt } : {}),
    ...(input.notes !== undefined
      ? { notes: normalizeOptionalString(input.notes) }
      : {}),
    updatedAt: new Date(),
  };
}

function buildCreatedPaymentSummary(input: CreateWorkOrderPaymentDto) {
  return {
    id: randomUUID(),
    amount: input.amount,
    paymentMethod: input.paymentMethod ?? null,
    paidAt: input.paidAt,
    notes: normalizeOptionalString(input.notes),
  };
}

function buildUpdatedPaymentSummary(
  payment: WorkOrderPaymentSummary,
  input: UpdateWorkOrderPaymentDto,
) {
  return {
    amount: input.amount ?? payment.amount,
    paymentMethod:
      input.paymentMethod !== undefined
        ? input.paymentMethod
        : payment.paymentMethod,
    paidAt: input.paidAt ?? payment.paidAt,
    notes:
      input.notes !== undefined
        ? normalizeOptionalString(input.notes)
        : payment.notes,
  };
}

function resolvePaymentStatus(
  currentStatus: string,
  estimates: WorkOrderEstimateSummary[],
  payments: WorkOrderPaymentSummary[],
) {
  const payableEstimate =
    estimates.find((estimate) => estimate.phase === 'FINAL') ??
    estimates.find((estimate) => estimate.phase === 'INITIAL');

  if (!payableEstimate) {
    return currentStatus;
  }

  const paidTotal = payments.reduce((sum, payment) => sum + payment.amount, 0);

  if (paidTotal <= 0) {
    return PaymentStatus.PENDING;
  }

  if (paidTotal < payableEstimate.totalPriceAmount) {
    return PaymentStatus.PARTIAL;
  }

  return PaymentStatus.PAID;
}

function buildDateWindow(
  field: 'estimatedCompletionAt' | 'estimatedCollectionAt' | 'completedAt',
  from?: Date,
  to?: Date,
) {
  return from || to
    ? {
        [field]: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      }
    : {};
}

function mapWorkOrderRecord(record: WorkOrderRecord): WorkOrderDetail {
  return {
    id: record.id,
    number: record.number,
    type: record.type,
    status: record.status,
    paymentStatus: record.paymentStatus,
    customerId: record.customerId,
    vehicleId: record.vehicleId,
    componentId: record.componentId,
    assignedEmployeeId: record.assignedEmployeeId,
    summary: record.summary,
    externalLink: record.externalLink,
    notes: normalizeJsonString(record.notes),
    estimatedCompletionAt: record.estimatedCompletionAt,
    estimatedCollectionAt: record.estimatedCollectionAt,
    completedAt: record.completedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    customer: record.Customer,
    vehicle: record.Vehicle,
    component: record.Component,
    assignedEmployee: record.Employee,
    workshopDetails: record.WorkshopWorkOrderDetails,
    estimates: record.WorkOrderEstimate.map((estimate) => ({
      id: estimate.id,
      phase: estimate.phase,
      totalCostAmount: estimate.totalCostAmount,
      totalPriceAmount: estimate.totalPriceAmount,
      notes: estimate.notes,
    })),
    actualCosts: record.WorkOrderActualCost.map((cost) => ({
      id: cost.id,
      category: cost.category,
      description: cost.description,
      amount: cost.amount,
      supplierId: cost.supplierId,
      inventoryItemId: cost.inventoryItemId,
      supplierQuoteHistoryId: cost.supplierQuoteHistoryId,
      paymentMethod: cost.paymentMethod,
      incurredAt: cost.incurredAt,
      notes: cost.notes,
      supplier: cost.Supplier,
      inventoryItem: cost.InventoryItem
        ? {
            id: cost.InventoryItem.id,
            name: cost.InventoryItem.name,
            sku: cost.InventoryItem.reference ?? cost.InventoryItem.identifier,
            reference: cost.InventoryItem.reference,
            identifier: cost.InventoryItem.identifier,
            defaultSalePrice: cost.InventoryItem.defaultSalePrice,
            isActive: cost.InventoryItem.isActive,
          }
        : null,
      supplierQuoteHistory: cost.SupplierQuoteHistory
        ? {
            id: cost.SupplierQuoteHistory.id,
            supplierId: cost.SupplierQuoteHistory.supplierId,
            inventoryItemId: cost.SupplierQuoteHistory.inventoryItemId,
            workOrderId: cost.SupplierQuoteHistory.workOrderId,
            quotedCost: cost.SupplierQuoteHistory.quotedCost,
            quotedAt: cost.SupplierQuoteHistory.quotedAt,
            status: cost.SupplierQuoteHistory.status,
            supplier: cost.SupplierQuoteHistory.Supplier,
            inventoryItem: cost.SupplierQuoteHistory.InventoryItem
              ? {
                  id: cost.SupplierQuoteHistory.InventoryItem.id,
                  name: cost.SupplierQuoteHistory.InventoryItem.name,
                  sku:
                    cost.SupplierQuoteHistory.InventoryItem.reference ??
                    cost.SupplierQuoteHistory.InventoryItem.identifier,
                  reference: cost.SupplierQuoteHistory.InventoryItem.reference,
                  identifier:
                    cost.SupplierQuoteHistory.InventoryItem.identifier,
                  defaultSalePrice:
                    cost.SupplierQuoteHistory.InventoryItem.defaultSalePrice,
                  isActive: cost.SupplierQuoteHistory.InventoryItem.isActive,
                }
              : null,
          }
        : null,
    })),
    payments: record.WorkOrderPayment.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paidAt: payment.paidAt,
      notes: payment.notes,
    })),
  };
}

function mapEstimateRecord(
  record: WorkOrderEstimateRecord,
): WorkOrderEstimateDetail {
  return {
    id: record.id,
    workOrderId: record.workOrderId,
    phase: record.phase,
    estimatedLaborHours: normalizeDecimalNumber(record.estimatedLaborHours),
    baseCostAmount: record.baseCostAmount,
    contingencyPct: record.contingencyPct,
    contingencyAmount: record.contingencyAmount,
    totalCostAmount: record.totalCostAmount,
    totalPriceAmount: record.totalPriceAmount,
    notes: record.notes,
    lines: record.WorkOrderEstimateLine.map((line) => ({
      id: line.id,
      lineType: line.lineType,
      description: line.description,
      inventoryItemId: line.inventoryItemId,
      serviceCatalogId: line.serviceCatalogId,
      supplierId: line.supplierId,
      supplierQuoteHistoryId: line.supplierQuoteHistoryId,
      quantity: line.quantity,
      unitCost: line.unitCost,
      unitPrice: line.unitPrice,
      notes: line.notes,
      inventoryItem: line.InventoryItem,
      serviceCatalog: line.ServiceCatalog,
      supplier: line.Supplier,
      supplierQuoteHistory: line.SupplierQuoteHistory
        ? {
            id: line.SupplierQuoteHistory.id,
            supplierId: line.SupplierQuoteHistory.supplierId,
            inventoryItemId: line.SupplierQuoteHistory.inventoryItemId,
            workOrderId: line.SupplierQuoteHistory.workOrderId,
            quotedCost: line.SupplierQuoteHistory.quotedCost,
            quotedAt: line.SupplierQuoteHistory.quotedAt,
            status: line.SupplierQuoteHistory.status,
            supplier: line.SupplierQuoteHistory.Supplier,
            inventoryItem: line.SupplierQuoteHistory.InventoryItem,
          }
        : null,
    })),
  };
}

function mapActualCostRecord(
  record: ActualCostRecord,
): WorkOrderActualCostSummary {
  return {
    id: record.id,
    category: record.category,
    description: record.description,
    amount: record.amount,
    supplierId: record.supplierId,
    inventoryItemId: record.inventoryItemId,
    supplierQuoteHistoryId: record.supplierQuoteHistoryId,
    paymentMethod: record.paymentMethod,
    incurredAt: record.incurredAt,
    notes: record.notes,
    supplier: record.Supplier,
    inventoryItem: record.InventoryItem
      ? {
          id: record.InventoryItem.id,
          name: record.InventoryItem.name,
          sku:
            record.InventoryItem.reference ?? record.InventoryItem.identifier,
          reference: record.InventoryItem.reference,
          identifier: record.InventoryItem.identifier,
          defaultSalePrice: record.InventoryItem.defaultSalePrice,
          isActive: record.InventoryItem.isActive,
        }
      : null,
    supplierQuoteHistory: record.SupplierQuoteHistory
      ? {
          id: record.SupplierQuoteHistory.id,
          supplierId: record.SupplierQuoteHistory.supplierId,
          inventoryItemId: record.SupplierQuoteHistory.inventoryItemId,
          workOrderId: record.SupplierQuoteHistory.workOrderId,
          quotedCost: record.SupplierQuoteHistory.quotedCost,
          quotedAt: record.SupplierQuoteHistory.quotedAt,
          status: record.SupplierQuoteHistory.status,
          supplier: record.SupplierQuoteHistory.Supplier,
          inventoryItem: record.SupplierQuoteHistory.InventoryItem
            ? {
                id: record.SupplierQuoteHistory.InventoryItem.id,
                name: record.SupplierQuoteHistory.InventoryItem.name,
                sku:
                  record.SupplierQuoteHistory.InventoryItem.reference ??
                  record.SupplierQuoteHistory.InventoryItem.identifier,
                reference: record.SupplierQuoteHistory.InventoryItem.reference,
                identifier:
                  record.SupplierQuoteHistory.InventoryItem.identifier,
                defaultSalePrice:
                  record.SupplierQuoteHistory.InventoryItem.defaultSalePrice,
                isActive: record.SupplierQuoteHistory.InventoryItem.isActive,
              }
            : null,
        }
      : null,
  };
}

function normalizeOptionalForeignKey(value?: string | null) {
  if (value === null) {
    return null;
  }

  return normalizeOptionalString(value);
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizeJsonString(value: Prisma.JsonValue | null) {
  if (typeof value === 'string') {
    return value;
  }

  return value === null ? null : JSON.stringify(value);
}

function normalizeDecimalNumber(value: DecimalValue) {
  if (value === null) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  return value.toNumber();
}
