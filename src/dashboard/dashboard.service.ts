import { Injectable } from '@nestjs/common';
import { calculateCurrentStock } from '../inventory/stock.helpers';
import {
  calculateBalance,
  resolvePayableAmount,
} from '../operations-reporting/calculations/operations-reporting.calculations';
import { DashboardOverviewQueryDto } from './dto/dashboard-overview-query.dto';
import { DashboardOverviewResponseDto } from './dto/dashboard-overview-response.dto';
import {
  DashboardInventoryItemRecord,
  DashboardRepository,
  DashboardWorkOrderRecord,
} from './dashboard.repository';

const ALERT_PREVIEW_LIMIT = 3;
const RECENT_ACTIVITY_LIMIT = 5;

@Injectable()
export class DashboardOverviewService {
  constructor(private readonly repository: DashboardRepository) {}

  async getOverview(
    query: DashboardOverviewQueryDto,
  ): Promise<DashboardOverviewResponseDto> {
    const [
      workOrders,
      collected,
      actualCosts,
      paidExpenses,
      pendingExpenses,
      inventoryItems,
      payrollSnapshot,
      recentPayments,
      recentExpenseRows,
      recentCompletedWorkOrders,
      recentInventoryMovements,
    ] = await Promise.all([
      this.repository.findWorkOrders(query),
      this.repository.aggregatePaymentsCollected(query),
      this.repository.aggregateActualCosts(query),
      this.repository.findPaidExpenses(query),
      this.repository.findPendingExpenses(query),
      this.repository.findInventoryItemsWithMovements(query),
      this.repository.findLatestPayrollSnapshot(query),
      this.repository.findRecentPayments(query, RECENT_ACTIVITY_LIMIT),
      this.repository.findRecentExpenses(query, RECENT_ACTIVITY_LIMIT),
      this.repository.findRecentCompletedWorkOrders(
        query,
        RECENT_ACTIVITY_LIMIT,
      ),
      this.repository.findRecentInventoryMovements(
        query,
        RECENT_ACTIVITY_LIMIT,
      ),
    ]);

    const paidExpensesTotal = sumAmounts(paidExpenses);
    const pendingExpensesTotal = sumAmounts(pendingExpenses);
    const payrollTotal = payrollSnapshot?.grandTotal ?? 0;
    const receivables = summarizeReceivables(workOrders);
    const lowStockItems = findLowStockItems(inventoryItems);
    const pendingReceivablePreview = buildPendingReceivablePreview(workOrders);
    const pendingExpensePreview = pendingExpenses
      .slice(0, ALERT_PREVIEW_LIMIT)
      .map((expense) => ({
        id: expense.id,
        label: expense.name,
        amount: expense.amount,
        occurredAt: expense.expectedAt.toISOString(),
      }));
    const lowStockPreview = lowStockItems
      .slice(0, ALERT_PREVIEW_LIMIT)
      .map((item) => ({
        id: item.id,
        label: `${item.name} · stock ${item.currentStock}/${item.minimumStock}`,
        amount: item.currentStock,
        occurredAt: null,
      }));
    const recentActivity = buildRecentActivity({
      recentPayments,
      recentExpenseRows,
      recentCompletedWorkOrders,
      recentInventoryMovements,
    });
    const approximate = receivables.unknownPayableCount > 0;
    const pendingReceivablesValue = approximate
      ? null
      : receivables.remainingKnownTotal;
    const approximateUtility = approximate
      ? collected - actualCosts - paidExpensesTotal
      : collected - actualCosts - paidExpensesTotal;
    const expenseExpected = pendingExpensesTotal + payrollTotal;
    const notes = buildNotes({
      approximate,
      unknownPayableCount: receivables.unknownPayableCount,
      hasNoRecords:
        workOrders.length === 0 &&
        paidExpenses.length === 0 &&
        pendingExpenses.length === 0 &&
        lowStockItems.length === 0 &&
        payrollSnapshot === null,
    });

    return {
      range: {
        from: query.from?.toISOString() ?? null,
        to: query.to?.toISOString() ?? null,
      },
      kpis: {
        workOrders: {
          open: countOpenWorkOrders(workOrders),
          completed: countByStatus(workOrders, 'COMPLETED'),
          paused: countByStatus(workOrders, 'PAUSED'),
          cancelled: countByStatus(workOrders, 'CANCELLED'),
        },
        cash: {
          collected,
          actualCosts,
          paidExpenses: paidExpensesTotal,
          pendingExpenses: pendingExpensesTotal,
          pendingReceivables: pendingReceivablesValue,
          approximateUtility,
        },
        inventory: {
          lowStockCount: lowStockItems.length,
        },
        payroll: {
          grandTotal: payrollSnapshot?.grandTotal ?? null,
          status: payrollSnapshot?.status ?? null,
          monthLabel: payrollSnapshot
            ? `${payrollSnapshot.year}-${String(payrollSnapshot.month).padStart(2, '0')}`
            : null,
        },
      },
      progress: {
        expenseCoverage: {
          paid: collected,
          expected: expenseExpected,
          ratio: toRatio(collected, expenseExpected),
          remaining: Math.max(expenseExpected - collected, 0),
        },
        payrollCoverage: {
          covered: collected,
          payrollTotal,
          ratio: toRatio(collected, payrollTotal),
          remaining: Math.max(payrollTotal - collected, 0),
        },
        receivablesCollection: {
          collected,
          knownPayable: receivables.knownPayableTotal,
          ratio: toRatio(collected, receivables.knownPayableTotal),
          remaining:
            receivables.knownPayableTotal > 0
              ? Math.max(receivables.knownPayableTotal - collected, 0)
              : 0,
          unknownPayableCount: receivables.unknownPayableCount,
        },
      },
      alerts: {
        pendingReceivables: receivables.pendingCount,
        pendingExpensesDue: pendingExpenses.length,
        lowStockItems: lowStockItems.length,
        unknownPayables: receivables.unknownPayableCount,
        previews: {
          pendingReceivables: pendingReceivablePreview,
          pendingExpenses: pendingExpensePreview,
          lowStockItems: lowStockPreview,
        },
      },
      recentActivity,
      metadata: {
        approximate,
        basis: 'dashboard-overview',
        notes,
        sectionDateBasis: {
          workOrders: 'createdAt/completedAt',
          cash: 'paidAt/incurredAt/expectedAt',
          inventory: 'occurredAt',
          payroll: 'year-month overlap',
          recentActivity: 'occurredAt',
        },
      },
    };
  }
}

function countByStatus(workOrders: DashboardWorkOrderRecord[], status: string) {
  return workOrders.filter((workOrder) => workOrder.status === status).length;
}

function countOpenWorkOrders(workOrders: DashboardWorkOrderRecord[]) {
  return workOrders.filter((workOrder) => workOrder.status === 'IN_PROGRESS')
    .length;
}

function summarizeReceivables(workOrders: DashboardWorkOrderRecord[]) {
  return workOrders.reduce(
    (summary, workOrder) => {
      const payableAmount = resolvePayableAmount(workOrder.WorkOrderEstimate);
      const paidTotal = sumAmounts(workOrder.WorkOrderPayment);
      const balance = calculateBalance({ payableAmount, paidTotal });
      const isCollectionTracked = workOrder.paymentStatus !== 'PENDING';
      const isPendingReceivable =
        workOrder.paymentStatus === 'PENDING' ||
        workOrder.paymentStatus === 'PARTIAL';

      if (payableAmount !== null && isCollectionTracked) {
        summary.knownPayableTotal += payableAmount;
        summary.knownCollectedTotal += Math.min(paidTotal, payableAmount);
      }

      if (balance !== null && isPendingReceivable) {
        summary.pendingCount += 1;
      }

      if (isPendingReceivable && payableAmount === null) {
        summary.unknownPayableCount += 1;
      }

      if (balance !== null && isPendingReceivable) {
        summary.remainingKnownTotal += Math.max(balance, 0);
      }

      return summary;
    },
    {
      knownPayableTotal: 0,
      knownCollectedTotal: 0,
      remainingKnownTotal: 0,
      unknownPayableCount: 0,
      pendingCount: 0,
    },
  );
}

function findLowStockItems(items: DashboardInventoryItemRecord[]) {
  return items
    .map((item) => ({
      id: item.id,
      name: item.name,
      minimumStock: item.minimumStock,
      currentStock: calculateCurrentStock(
        item.InventoryMovement.map((movement) => ({
          inventoryItemId: item.id,
          movementType: movement.movementType,
          _sum: { quantity: movement.quantity },
        })),
      ),
    }))
    .filter((item) => item.currentStock <= item.minimumStock);
}

function buildPendingReceivablePreview(workOrders: DashboardWorkOrderRecord[]) {
  return workOrders
    .filter(
      (workOrder) =>
        workOrder.paymentStatus === 'PENDING' ||
        workOrder.paymentStatus === 'PARTIAL',
    )
    .map((workOrder) => {
      const payableAmount = resolvePayableAmount(workOrder.WorkOrderEstimate);
      const paidTotal = sumAmounts(workOrder.WorkOrderPayment);
      const balance = calculateBalance({ payableAmount, paidTotal });

      return {
        id: workOrder.id,
        label: `OT ${workOrder.number} · ${workOrder.Customer?.name ?? 'Sin cliente'}`,
        amount: balance === null ? null : Math.max(balance, 0),
        occurredAt: workOrder.estimatedCollectionAt?.toISOString() ?? null,
      };
    })
    .sort((left, right) => {
      const leftTime = left.occurredAt
        ? Date.parse(left.occurredAt)
        : Number.MAX_SAFE_INTEGER;
      const rightTime = right.occurredAt
        ? Date.parse(right.occurredAt)
        : Number.MAX_SAFE_INTEGER;

      return leftTime - rightTime;
    })
    .slice(0, ALERT_PREVIEW_LIMIT);
}

function buildRecentActivity(input: {
  recentPayments: Array<{
    id: string;
    amount: number;
    paidAt: Date;
    WorkOrder: {
      id: string;
      number: number;
      Customer: { name: string } | null;
    };
  }>;
  recentExpenseRows: Array<{
    id: string;
    name: string;
    amount: number;
    paidAt: Date | null;
  }>;
  recentCompletedWorkOrders: Array<{
    id: string;
    number: number;
    summary: string;
    completedAt: Date | null;
    Customer: { name: string } | null;
  }>;
  recentInventoryMovements: Array<{
    id: string;
    occurredAt: Date;
    movementType: string;
    quantity: number;
    InventoryItem: { name: string };
  }>;
}) {
  return [
    ...input.recentPayments.map((row) => ({
      type: 'PAYMENT',
      occurredAt: row.paidAt.toISOString(),
      label: `Pago OT ${row.WorkOrder.number} · ${row.WorkOrder.Customer?.name ?? 'Sin cliente'}`,
      amount: row.amount,
    })),
    ...input.recentExpenseRows
      .filter((row) => row.paidAt)
      .map((row) => ({
        type: 'EXPENSE_PAID',
        occurredAt: row.paidAt?.toISOString() ?? new Date(0).toISOString(),
        label: `Gasto pagado · ${row.name}`,
        amount: row.amount,
      })),
    ...input.recentCompletedWorkOrders
      .filter((row) => row.completedAt)
      .map((row) => ({
        type: 'WORK_ORDER_COMPLETED',
        occurredAt: row.completedAt?.toISOString() ?? new Date(0).toISOString(),
        label: `OT ${row.number} completada · ${row.Customer?.name ?? row.summary}`,
        amount: null,
      })),
    ...input.recentInventoryMovements.map((row) => ({
      type: 'INVENTORY_MOVEMENT',
      occurredAt: row.occurredAt.toISOString(),
      label: `Movimiento ${row.movementType} · ${row.InventoryItem.name} x${row.quantity}`,
      amount: null,
    })),
  ]
    .sort(
      (left, right) =>
        Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
    )
    .slice(0, RECENT_ACTIVITY_LIMIT);
}

function buildNotes(input: {
  approximate: boolean;
  unknownPayableCount: number;
  hasNoRecords: boolean;
}) {
  const notes: string[] = [];

  if (input.hasNoRecords) {
    notes.push('No matching dashboard records for the selected range.');
  }

  if (input.approximate) {
    notes.push(
      `Pending receivables are approximate because ${input.unknownPayableCount} work order has no reliable payable amount.`.replace(
        '1 work order',
        input.unknownPayableCount === 1
          ? '1 work order'
          : `${input.unknownPayableCount} work orders`,
      ),
    );
  }

  return notes;
}

function sumAmounts(rows: Array<{ amount: number }>) {
  return rows.reduce((total, row) => total + row.amount, 0);
}

function toRatio(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return null;
  }

  return numerator / denominator;
}
