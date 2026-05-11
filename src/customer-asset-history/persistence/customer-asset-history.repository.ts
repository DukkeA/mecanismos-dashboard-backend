import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import type {
  EstimatePhase,
  PaymentStatus,
  WorkOrderStatus,
  WorkOrderType,
} from '../../../generated/prisma/enums';
import { CUSTOMER_ASSET_HISTORY_PRISMA_CLIENT } from '../customer-asset-history.tokens';
import { type CustomerAssetHistoryDateField } from '../dto/customer-asset-history-query.dto';

type WorkOrderWhereInput = Prisma.WorkOrderWhereInput;

export type CustomerAssetHistoryScope = 'customer' | 'vehicle' | 'component';

export type CustomerAssetHistoryScopeQuery = {
  scope: CustomerAssetHistoryScope;
  subjectId: string;
  page: number;
  limit: number;
  dateFrom?: Date;
  dateTo?: Date;
  dateField: (typeof CustomerAssetHistoryDateField)[keyof typeof CustomerAssetHistoryDateField];
  status?: WorkOrderStatus;
  paymentStatus?: PaymentStatus;
  type?: WorkOrderType;
};

export type CustomerHistorySubjectReadModel = {
  id: string;
  name: string;
  phone: string;
  documentType: string;
  documentNumber: string;
  email: string | null;
};

export type VehicleHistorySubjectReadModel = {
  id: string;
  customerId: string;
  brand: string;
  modelReference: string;
  plate: string;
  Customer: { id: string; name: string } | null;
};

export type ComponentHistorySubjectReadModel = {
  id: string;
  customerId: string;
  vehicleId: string | null;
  brand: string;
  reference: string;
  identifier: string | null;
  Customer: { id: string; name: string } | null;
  Vehicle: {
    id: string;
    brand: string;
    modelReference: string;
    plate: string;
  } | null;
  componentType: { id: string; name: string } | null;
};

export type VehicleRelatedAssetReadModel = {
  id: string;
  brand: string;
  modelReference: string;
  plate: string;
};

export type ComponentRelatedAssetReadModel = {
  id: string;
  brand: string;
  reference: string;
  identifier: string | null;
};

export type CustomerHistoryRelatedAssetsReadModel = {
  vehicles: VehicleRelatedAssetReadModel[];
  components: ComponentRelatedAssetReadModel[];
};

export type VehicleHistoryRelatedAssetsReadModel = {
  customer: { id: string; name: string } | null;
  components: ComponentRelatedAssetReadModel[];
};

export type ComponentHistoryRelatedAssetsReadModel = {
  customer: { id: string; name: string } | null;
  vehicle: VehicleRelatedAssetReadModel | null;
};

export type HistoryEstimateReadModel = {
  phase: EstimatePhase;
  totalPriceAmount: number;
};

export type HistoryAmountReadModel = {
  id: string;
  amount: number;
};

export type CustomerAssetHistoryRowReadModel = {
  id: string;
  number: number;
  type: string;
  status: string;
  paymentStatus: string;
  customerId: string;
  vehicleId: string | null;
  componentId: string | null;
  summary: string;
  createdAt: Date;
  completedAt: Date | null;
  estimatedCollectionAt: Date | null;
  Customer: { id: string; name: string } | null;
  Vehicle: VehicleRelatedAssetReadModel | null;
  Component: ComponentRelatedAssetReadModel | null;
  Employee: {
    id: string;
    name: string;
    type: string | null;
    isActive: boolean | null;
  } | null;
  WorkshopWorkOrderDetails: {
    customerReportedIssue: string | null;
    diagnosisSummary: string | null;
  } | null;
  WorkOrderEstimate: HistoryEstimateReadModel[];
  WorkOrderPayment: HistoryAmountReadModel[];
  WorkOrderActualCost: HistoryAmountReadModel[];
};

type CustomerAssetHistoryPrismaClient = {
  customer: {
    findUnique(args: {
      where: { id: string };
      select: Record<string, unknown>;
    }): Promise<CustomerHistorySubjectReadModel | null>;
  };
  vehicle: {
    findUnique(args: {
      where: { id: string };
      select: Record<string, unknown>;
    }): Promise<VehicleHistorySubjectReadModel | null>;
    findMany(args: {
      where: Record<string, unknown>;
      orderBy?: Array<Record<string, 'asc'>>;
      select: Record<string, unknown>;
    }): Promise<
      | VehicleRelatedAssetReadModel[]
      | Array<{
          Customer: { id: string; name: string } | null;
          Component: ComponentRelatedAssetReadModel[];
        }>
    >;
  };
  component: {
    findUnique(args: {
      where: { id: string };
      select: Record<string, unknown>;
    }): Promise<ComponentHistorySubjectReadModel | null>;
    findMany(args: {
      where: Record<string, unknown>;
      orderBy?: Array<Record<string, 'asc'>>;
      select: Record<string, unknown>;
    }): Promise<
      | ComponentRelatedAssetReadModel[]
      | Array<{
          Customer: { id: string; name: string } | null;
          Vehicle: VehicleRelatedAssetReadModel | null;
        }>
    >;
  };
  workOrder: {
    count(args: { where: WorkOrderWhereInput }): Promise<number>;
    findMany(args: {
      where: WorkOrderWhereInput;
      orderBy: Array<Record<string, 'desc'>>;
      skip?: number;
      take?: number;
      select: Record<string, unknown>;
    }): Promise<CustomerAssetHistoryRowReadModel[]>;
  };
};

const historyRowSelect = {
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
  WorkOrderPayment: { select: { id: true, amount: true } },
  WorkOrderActualCost: { select: { id: true, amount: true } },
} as const;

@Injectable()
export class CustomerAssetHistoryRepository {
  constructor(
    @Inject(CUSTOMER_ASSET_HISTORY_PRISMA_CLIENT)
    private readonly prisma: CustomerAssetHistoryPrismaClient,
  ) {}

  findCustomerSubject(customerId: string) {
    return this.prisma.customer.findUnique({
      where: { id: customerId },
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

  findVehicleSubject(vehicleId: string) {
    return this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: {
        id: true,
        customerId: true,
        brand: true,
        modelReference: true,
        plate: true,
        Customer: { select: { id: true, name: true } },
      },
    });
  }

  findComponentSubject(componentId: string) {
    return this.prisma.component.findUnique({
      where: { id: componentId },
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
  }

  async findCustomerRelatedAssets(
    customerId: string,
  ): Promise<CustomerHistoryRelatedAssetsReadModel> {
    const [vehicles, components] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: { customerId },
        orderBy: [{ brand: 'asc' }, { plate: 'asc' }],
        select: { id: true, brand: true, modelReference: true, plate: true },
      }) as Promise<VehicleRelatedAssetReadModel[]>,
      this.prisma.component.findMany({
        where: { customerId },
        orderBy: [{ brand: 'asc' }, { reference: 'asc' }],
        select: { id: true, brand: true, reference: true, identifier: true },
      }) as Promise<ComponentRelatedAssetReadModel[]>,
    ]);

    return { vehicles, components };
  }

  async findVehicleRelatedAssets(
    vehicleId: string,
  ): Promise<VehicleHistoryRelatedAssetsReadModel> {
    const [record] = (await this.prisma.vehicle.findMany({
      where: { id: vehicleId },
      select: {
        Customer: { select: { id: true, name: true } },
        Component: {
          orderBy: [{ brand: 'asc' }, { reference: 'asc' }],
          select: { id: true, brand: true, reference: true, identifier: true },
        },
      },
    })) as Array<{
      Customer: { id: string; name: string } | null;
      Component: ComponentRelatedAssetReadModel[];
    }>;

    return {
      customer: record?.Customer ?? null,
      components: record?.Component ?? [],
    };
  }

  async findComponentRelatedAssets(
    componentId: string,
  ): Promise<ComponentHistoryRelatedAssetsReadModel> {
    const [record] = (await this.prisma.component.findMany({
      where: { id: componentId },
      select: {
        Customer: { select: { id: true, name: true } },
        Vehicle: {
          select: { id: true, brand: true, modelReference: true, plate: true },
        },
      },
    })) as Array<{
      Customer: { id: string; name: string } | null;
      Vehicle: VehicleRelatedAssetReadModel | null;
    }>;

    return {
      customer: record?.Customer ?? null,
      vehicle: record?.Vehicle ?? null,
    };
  }

  countScopedHistory(query: CustomerAssetHistoryScopeQuery) {
    return this.prisma.workOrder.count({
      where: buildScopedHistoryWhere(query),
    });
  }

  findScopedHistoryRows(query: CustomerAssetHistoryScopeQuery) {
    return this.prisma.workOrder.findMany({
      where: buildScopedHistoryWhere(query),
      orderBy: buildScopedHistoryOrderBy(query),
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: historyRowSelect,
    });
  }

  findScopedHistoryFinancialRows(query: CustomerAssetHistoryScopeQuery) {
    return this.prisma.workOrder.findMany({
      where: buildScopedHistoryWhere(query),
      orderBy: buildScopedHistoryOrderBy(query),
      select: historyRowSelect,
    });
  }
}

function buildScopedHistoryWhere(
  query: CustomerAssetHistoryScopeQuery,
): WorkOrderWhereInput {
  return {
    ...resolveScopeWhere(query.scope, query.subjectId),
    ...buildDateWindow(query.dateField, query),
    ...(query.status ? { status: query.status } : {}),
    ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
    ...(query.type ? { type: query.type } : {}),
  };
}

function resolveScopeWhere(
  scope: CustomerAssetHistoryScope,
  subjectId: string,
) {
  if (scope === 'vehicle') {
    return { vehicleId: subjectId };
  }

  if (scope === 'component') {
    return { componentId: subjectId };
  }

  return { customerId: subjectId };
}

function buildDateWindow(
  field: CustomerAssetHistoryScopeQuery['dateField'],
  query: Pick<CustomerAssetHistoryScopeQuery, 'dateFrom' | 'dateTo'>,
) {
  if (!query.dateFrom && !query.dateTo) {
    return {};
  }

  return {
    [field]: {
      ...(query.dateFrom ? { gte: query.dateFrom } : {}),
      ...(query.dateTo ? { lte: query.dateTo } : {}),
    },
  };
}

function buildScopedHistoryOrderBy(query: CustomerAssetHistoryScopeQuery) {
  return [{ [query.dateField]: 'desc' }, { number: 'desc' }] as Array<
    Record<string, 'desc'>
  >;
}
