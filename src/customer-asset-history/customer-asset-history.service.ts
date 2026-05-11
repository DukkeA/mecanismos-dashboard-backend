import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { buildPaginationMeta } from '../common/pagination/pagination-meta';
import {
  calculateBalance,
  resolvePayableAmount,
} from '../operations-reporting/calculations/operations-reporting.calculations';
import { CustomerAssetHistoryQueryDto } from './dto/customer-asset-history-query.dto';
import { CustomerAssetHistoryResponseDto } from './dto/customer-asset-history-response.dto';
import {
  type ComponentHistoryRelatedAssetsReadModel,
  type ComponentHistorySubjectReadModel,
  type ComponentRelatedAssetReadModel,
  type CustomerAssetHistoryRowReadModel,
  type CustomerAssetHistoryScope,
  type CustomerAssetHistoryScopeQuery,
  type CustomerHistoryRelatedAssetsReadModel,
  type CustomerHistorySubjectReadModel,
  CustomerAssetHistoryRepository,
  type VehicleHistoryRelatedAssetsReadModel,
  type VehicleHistorySubjectReadModel,
  type VehicleRelatedAssetReadModel,
} from './persistence/customer-asset-history.repository';

@Injectable()
export class CustomerAssetHistoryService {
  private readonly logger = new Logger(CustomerAssetHistoryService.name);

  constructor(
    private readonly repository: CustomerAssetHistoryRepository,
  ) {}

  async getCustomerHistory(
    customerId: string,
    query: CustomerAssetHistoryQueryDto,
  ): Promise<CustomerAssetHistoryResponseDto> {
    const subject = await this.repository.findCustomerSubject(customerId);

    if (!subject) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    return this.buildHistoryResponse('customer', customerId, query, subject);
  }

  async getVehicleHistory(
    vehicleId: string,
    query: CustomerAssetHistoryQueryDto,
  ): Promise<CustomerAssetHistoryResponseDto> {
    const subject = await this.repository.findVehicleSubject(vehicleId);

    if (!subject) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found`);
    }

    return this.buildHistoryResponse('vehicle', vehicleId, query, subject);
  }

  async getComponentHistory(
    componentId: string,
    query: CustomerAssetHistoryQueryDto,
  ): Promise<CustomerAssetHistoryResponseDto> {
    const subject = await this.repository.findComponentSubject(componentId);

    if (!subject) {
      throw new NotFoundException(`Component ${componentId} not found`);
    }

    return this.buildHistoryResponse('component', componentId, query, subject);
  }

  private async buildHistoryResponse(
    scope: CustomerAssetHistoryScope,
    subjectId: string,
    query: CustomerAssetHistoryQueryDto,
    subject:
      | CustomerHistorySubjectReadModel
      | VehicleHistorySubjectReadModel
      | ComponentHistorySubjectReadModel,
  ): Promise<CustomerAssetHistoryResponseDto> {
    const scopeQuery = this.buildScopeQuery(scope, subjectId, query);

    try {
      const [relatedAssets, total, rows, financialRows] = await Promise.all([
        this.findRelatedAssets(scope, subjectId),
        this.repository.countScopedHistory(scopeQuery),
        this.repository.findScopedHistoryRows(scopeQuery),
        this.repository.findScopedHistoryFinancialRows(scopeQuery),
      ]);

      return {
        subject: mapSubject(scope, subject),
        relatedAssets: mapRelatedAssets(scope, relatedAssets),
        summary: buildSummary(financialRows),
        data: rows.map(mapHistoryRow),
        meta: buildPaginationMeta({
          page: scopeQuery.page,
          limit: scopeQuery.limit,
          total,
        }),
      };
    } catch (error) {
      this.logger.error(
        `history scope=${scope} subjectId=${subjectId} failed`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private buildScopeQuery(
    scope: CustomerAssetHistoryScope,
    subjectId: string,
    query: CustomerAssetHistoryQueryDto,
  ): CustomerAssetHistoryScopeQuery {
    return {
      scope,
      subjectId,
      page: query.page,
      limit: query.limit,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      dateField: query.dateField,
      status: query.status,
      paymentStatus: query.paymentStatus,
      type: query.type,
    };
  }

  private findRelatedAssets(scope: CustomerAssetHistoryScope, subjectId: string) {
    if (scope === 'vehicle') {
      return this.repository.findVehicleRelatedAssets(subjectId);
    }

    if (scope === 'component') {
      return this.repository.findComponentRelatedAssets(subjectId);
    }

    return this.repository.findCustomerRelatedAssets(subjectId);
  }
}

function mapSubject(
  scope: CustomerAssetHistoryScope,
  subject:
    | CustomerHistorySubjectReadModel
    | VehicleHistorySubjectReadModel
    | ComponentHistorySubjectReadModel,
) {
  if (scope === 'vehicle') {
    const vehicle = subject as VehicleHistorySubjectReadModel;
    return {
      id: vehicle.id,
      scope: 'VEHICLE' as const,
      label: buildVehicleLabel(vehicle),
      customerId: vehicle.customerId,
      brand: vehicle.brand,
      modelReference: vehicle.modelReference,
      plate: vehicle.plate,
    };
  }

  if (scope === 'component') {
    const component = subject as ComponentHistorySubjectReadModel;
    return {
      id: component.id,
      scope: 'COMPONENT' as const,
      label: buildComponentLabel(component),
      customerId: component.customerId,
      vehicleId: component.vehicleId,
      brand: component.brand,
      reference: component.reference,
      identifier: component.identifier,
      componentTypeName: component.componentType?.name ?? null,
    };
  }

  const customer = subject as CustomerHistorySubjectReadModel;
  return {
    id: customer.id,
    scope: 'CUSTOMER' as const,
    label: customer.name,
    name: customer.name,
    phone: customer.phone,
    documentType: customer.documentType,
    documentNumber: customer.documentNumber,
    email: customer.email,
  };
}

function mapRelatedAssets(
  scope: CustomerAssetHistoryScope,
  relatedAssets:
    | CustomerHistoryRelatedAssetsReadModel
    | VehicleHistoryRelatedAssetsReadModel
    | ComponentHistoryRelatedAssetsReadModel,
) {
  if (scope === 'vehicle') {
    const vehicleAssets = relatedAssets as VehicleHistoryRelatedAssetsReadModel;
    return {
      customer: vehicleAssets.customer
        ? { id: vehicleAssets.customer.id, label: vehicleAssets.customer.name }
        : null,
      vehicle: null,
      vehicles: [],
      components: vehicleAssets.components.map((component) => ({
        id: component.id,
        label: buildComponentLabel(component),
      })),
    };
  }

  if (scope === 'component') {
    const componentAssets = relatedAssets as ComponentHistoryRelatedAssetsReadModel;
    return {
      customer: componentAssets.customer
        ? { id: componentAssets.customer.id, label: componentAssets.customer.name }
        : null,
      vehicle: componentAssets.vehicle
        ? {
            id: componentAssets.vehicle.id,
            label: buildVehicleLabel(componentAssets.vehicle),
          }
        : null,
      vehicles: [],
      components: [],
    };
  }

  const customerAssets = relatedAssets as CustomerHistoryRelatedAssetsReadModel;
  return {
    customer: null,
    vehicle: null,
    vehicles: customerAssets.vehicles.map((vehicle) => ({
      id: vehicle.id,
      label: buildVehicleLabel(vehicle),
    })),
    components: customerAssets.components.map((component) => ({
      id: component.id,
      label: buildComponentLabel(component),
    })),
  };
}

function mapHistoryRow(row: CustomerAssetHistoryRowReadModel) {
  const payableAmount = resolvePayableAmount(row.WorkOrderEstimate);
  const paidTotal = sumAmounts(row.WorkOrderPayment);

  return {
    workOrderId: row.id,
    number: row.number,
    type: row.type,
    status: row.status,
    paymentStatus: row.paymentStatus,
    summary: row.summary,
    assetLabel: buildAssetLabel(row),
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    estimatedCollectionAt: row.estimatedCollectionAt?.toISOString() ?? null,
    latestWorkshopSignal:
      row.WorkshopWorkOrderDetails?.diagnosisSummary ??
      row.WorkshopWorkOrderDetails?.customerReportedIssue ??
      null,
    assignedEmployee: row.Employee
      ? {
          id: row.Employee.id,
          name: row.Employee.name,
          type: row.Employee.type,
          isActive: row.Employee.isActive,
        }
      : null,
    payableAmount,
    paidTotal,
    balance: calculateBalance({ payableAmount, paidTotal }),
    actualCostTotal: sumAmounts(row.WorkOrderActualCost),
    links: {
      workOrderId: row.id,
      customerId: row.customerId,
      vehicleId: row.vehicleId,
      componentId: row.componentId,
    },
  };
}

function buildSummary(rows: CustomerAssetHistoryRowReadModel[]) {
  return rows.reduce(
    (summary, row) => {
      const payableAmount = resolvePayableAmount(row.WorkOrderEstimate);
      const paidTotal = sumAmounts(row.WorkOrderPayment);
      const actualCostTotal = sumAmounts(row.WorkOrderActualCost);
      const balance = calculateBalance({ payableAmount, paidTotal });

      return {
        totalWorkOrders: summary.totalWorkOrders + 1,
        unknownPayableCount:
          summary.unknownPayableCount + (payableAmount === null ? 1 : 0),
        payableAmount:
          summary.payableAmount + (payableAmount === null ? 0 : payableAmount),
        paidTotal: summary.paidTotal + paidTotal,
        balance: summary.balance + (balance ?? 0),
        actualCostTotal: summary.actualCostTotal + actualCostTotal,
      };
    },
    {
      totalWorkOrders: 0,
      unknownPayableCount: 0,
      payableAmount: 0,
      paidTotal: 0,
      balance: 0,
      actualCostTotal: 0,
    },
  );
}

function sumAmounts(rows: Array<{ amount: number }>) {
  return rows.reduce((total, row) => total + row.amount, 0);
}

function buildAssetLabel(row: {
  Component: ComponentRelatedAssetReadModel | null;
  Vehicle: VehicleRelatedAssetReadModel | null;
  Customer: { name: string } | null;
}) {
  if (row.Component) {
    return buildComponentLabel(row.Component);
  }

  if (row.Vehicle) {
    return buildVehicleLabel(row.Vehicle);
  }

  return row.Customer?.name ?? 'Sin activo relacionado';
}

function buildVehicleLabel(vehicle: {
  brand: string;
  modelReference: string;
  plate: string;
}) {
  return `${vehicle.brand} ${vehicle.modelReference} · ${vehicle.plate}`;
}

function buildComponentLabel(component: {
  brand: string;
  reference: string;
  identifier: string | null;
}) {
  return component.identifier
    ? `${component.brand} ${component.reference} · ${component.identifier}`
    : `${component.brand} ${component.reference}`;
}
