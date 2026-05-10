import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentStatus, WorkOrderStatus } from '../../../generated/prisma/enums';
import type { Prisma } from '../../../generated/prisma/client';
import type { CreateWorkOrderDto } from '../dto/create-work-order.dto';
import type { ListWorkOrdersQueryDto } from '../dto/list-work-orders-query.dto';
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

export type WorkOrderActualCostSummary = {
  id: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string | null;
  incurredAt: Date;
  notes: string | null;
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
  customer: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; name: true; phone: true; documentType: true; documentNumber: true; email: true };
    }): Promise<WorkOrderCustomerSummary | null>;
  };
  vehicle: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; customerId: true; brand: true; modelReference: true; plate: true };
    }): Promise<WorkOrderVehicleSummary | null>;
  };
  component: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; customerId: true; vehicleId: true; brand: true; reference: true; identifier: true };
    }): Promise<WorkOrderComponentSummary | null>;
  };
  employee: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; name: true; type: true; isActive: true };
    }): Promise<WorkOrderEmployeeSummary | null>;
  };
  workOrder: {
    create(args: { data: Record<string, unknown>; include: typeof workOrderDetailInclude }): Promise<WorkOrderRecord>;
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
    paymentMethod: string | null;
    incurredAt: Date;
    notes: string | null;
  }>;
  WorkOrderPayment: Array<{
    id: string;
    amount: number;
    paymentMethod: string | null;
    paidAt: Date;
    notes: string | null;
  }>;
};

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
  },
  WorkOrderPayment: {
    orderBy: { paidAt: 'desc' as const },
  },
} as const;

@Injectable()
export class WorkOrdersRepository {
  constructor(
    @Inject(WORK_ORDERS_PRISMA_CLIENT)
    readonly prisma: WorkOrdersPrismaClient,
  ) {}

  create(input: CreateWorkOrderDto) {
    const now = new Date();

    return this.prisma.workOrder
      .create({
        data: {
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
          updatedAt: now,
        },
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

  update(id: string, input: UpdateWorkOrderDto) {
    const now = new Date();

    return this.prisma.workOrder
      .update({
        where: { id },
        data: {
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
          updatedAt: now,
        },
        include: workOrderDetailInclude,
      })
      .then(mapWorkOrderRecord);
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
}

function buildWorkOrderWhere(query: ListWorkOrdersQueryDto): WorkOrderWhereInput {
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
    ...buildDateWindow('estimatedCompletionAt', query.estimatedCompletionFrom, query.estimatedCompletionTo),
    ...buildDateWindow('estimatedCollectionAt', query.estimatedCollectionFrom, query.estimatedCollectionTo),
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
      paymentMethod: cost.paymentMethod,
      incurredAt: cost.incurredAt,
      notes: cost.notes,
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
