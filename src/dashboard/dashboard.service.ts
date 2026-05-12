import { Injectable } from '@nestjs/common';
import { calculateCurrentStock } from '../inventory/stock.helpers';
import {
  calculateBalance,
  resolvePayableAmount,
} from '../operations-reporting/calculations/operations-reporting.calculations';
import { DashboardActionItemsQueryDto } from './dto/dashboard-action-items-query.dto';
import {
  DashboardActionItemDto,
  DashboardActionItemCategory,
  DashboardActionItemDateBasis,
  DashboardActionItemSeverity,
  DashboardActionItemsResponseDto,
} from './dto/dashboard-action-items-response.dto';
import { DashboardOverviewQueryDto } from './dto/dashboard-overview-query.dto';
import { DashboardOverviewResponseDto } from './dto/dashboard-overview-response.dto';
import {
  DashboardActionInventoryItemRecord,
  DashboardExpenseRecord,
  DashboardInventoryItemRecord,
  DashboardRepository,
  DashboardWorkOrderRecord,
} from './dashboard.repository';

const ALERT_PREVIEW_LIMIT = 3;
const RECENT_ACTIVITY_LIMIT = 5;

@Injectable()
export class DashboardOverviewService {
  constructor(private readonly repository: DashboardRepository) {}

  async getActionItems(
    query: DashboardActionItemsQueryDto,
  ): Promise<DashboardActionItemsResponseDto> {
    const [
      workOrders,
      receivables,
      expenses,
      inventoryItems,
      collected,
      payroll,
    ] = await Promise.all([
      this.repository.findOpenWorkOrdersForActions(query),
      this.repository.findReceivableWorkOrdersForActions(query),
      this.repository.findPendingExpensesForActions(query),
      this.repository.findInventoryItemsForActions(query),
      this.repository.aggregatePaymentsCollected(query),
      this.repository.findLatestPayrollSnapshot(query),
    ]);

    const lowStockItems = findLowStockActionItems(inventoryItems);
    const items = sortActionItems([
      ...workOrders.map((workOrder) => buildWorkOrderActionItem(workOrder)),
      ...receivables.map((workOrder) => buildReceivableActionItem(workOrder)),
      ...expenses.map((expense) => buildExpenseActionItem(expense)),
      ...lowStockItems.map((item) => buildLowStockActionItem(item)),
      ...lowStockItems
        .filter((item) => hasUnknownPriceRisk(item))
        .map((item) => buildPriceRiskActionItem(item)),
      ...buildCashRiskActionItems({ collected, expenses, payroll }),
    ]);

    return {
      range: {
        from: formatDateOnly(query.from),
        to: formatDateOnly(query.to),
      },
      items,
      metadata: {
        approximate: items.some((item) => item.riskFlags.length > 0),
        generatedAt: new Date().toISOString(),
        itemCount: items.length,
        categoryCounts: buildActionItemCategoryCounts(items),
        dateBasis: buildActionItemDateBasis(),
        notes: buildActionItemNotes(items),
      },
    };
  }

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

function formatDateOnly(value: Date | undefined) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function buildEmptyActionItemCategoryCounts() {
  return {
    [DashboardActionItemCategory.WORK_ORDER_OVERDUE]: 0,
    [DashboardActionItemCategory.RECEIVABLE]: 0,
    [DashboardActionItemCategory.EXPENSE]: 0,
    [DashboardActionItemCategory.LOW_STOCK]: 0,
    [DashboardActionItemCategory.PRICE_RISK]: 0,
    [DashboardActionItemCategory.CASH_RISK]: 0,
  };
}

function buildActionItemDateBasis() {
  return {
    [DashboardActionItemCategory.WORK_ORDER_OVERDUE]:
      DashboardActionItemDateBasis.ESTIMATED_COMPLETION_AT,
    [DashboardActionItemCategory.RECEIVABLE]:
      DashboardActionItemDateBasis.ESTIMATED_COLLECTION_AT,
    [DashboardActionItemCategory.EXPENSE]:
      DashboardActionItemDateBasis.EXPECTED_AT,
    [DashboardActionItemCategory.LOW_STOCK]:
      DashboardActionItemDateBasis.STOCK_AS_OF_TO,
    [DashboardActionItemCategory.PRICE_RISK]:
      DashboardActionItemDateBasis.ACTIVE_QUOTE_STATE_AS_OF_TO,
    [DashboardActionItemCategory.CASH_RISK]:
      DashboardActionItemDateBasis.SELECTED_RANGE_COLLECTIONS_VS_PENDING_EXPENSES,
  };
}

function buildActionItemCategoryCounts(items: DashboardActionItemDto[]) {
  const counts = buildEmptyActionItemCategoryCounts();

  for (const item of items) {
    counts[item.category] += 1;
  }

  return counts;
}

function buildActionItemNotes(items: DashboardActionItemDto[]) {
  const notes = ['Nullable amounts represent unknown values, not zero.'];

  if (items.some((item) => item.riskFlags.includes('unknownPayable'))) {
    notes.push(
      'Some receivable amounts are unknown because no reliable payable amount is available.',
    );
  }

  if (items.some((item) => item.riskFlags.includes('unknownPrice'))) {
    notes.push(
      'Price-risk items are advisory and do not claim exact margin or loss.',
    );
  }

  if (
    items.some((item) => item.riskFlags.includes('cashPressureApproximate'))
  ) {
    notes.push(
      'Cash-risk items compare selected-range collections against known pending expenses and payroll pressure only.',
    );
  }

  return notes;
}

function buildWorkOrderActionItem(
  workOrder: DashboardWorkOrderRecord,
): DashboardActionItemDto {
  const dueAt = formatDateOnly(workOrder.estimatedCompletionAt ?? undefined);

  return {
    id: `${DashboardActionItemCategory.WORK_ORDER_OVERDUE}:${workOrder.id}`,
    category: DashboardActionItemCategory.WORK_ORDER_OVERDUE,
    severity: DashboardActionItemSeverity.CRITICAL,
    status: 'overdue',
    title: `Work order OT ${workOrder.number} needs completion follow-up`,
    entity: buildWorkOrderEntity(workOrder),
    dueAt,
    amount: null,
    riskFlags: [],
    dateBasis: DashboardActionItemDateBasis.ESTIMATED_COMPLETION_AT,
    notes: ['Anchored to estimatedCompletionAt; no workflow state is changed.'],
  };
}

function buildReceivableActionItem(
  workOrder: DashboardWorkOrderRecord,
): DashboardActionItemDto {
  const payableAmount = resolvePayableAmount(workOrder.WorkOrderEstimate);
  const paidTotal = sumAmounts(workOrder.WorkOrderPayment);
  const balance = calculateBalance({ payableAmount, paidTotal });
  const isUnknown = balance === null;

  return {
    id: `${DashboardActionItemCategory.RECEIVABLE}:${workOrder.id}`,
    category: DashboardActionItemCategory.RECEIVABLE,
    severity: DashboardActionItemSeverity.CRITICAL,
    status: workOrder.paymentStatus.toLowerCase(),
    title: `Receivable follow-up for OT ${workOrder.number}`,
    entity: buildWorkOrderEntity(workOrder),
    dueAt: formatDateOnly(workOrder.estimatedCollectionAt ?? undefined),
    amount: balance === null ? null : Math.max(balance, 0),
    riskFlags: isUnknown ? ['unknownPayable'] : [],
    dateBasis: DashboardActionItemDateBasis.ESTIMATED_COLLECTION_AT,
    notes: isUnknown
      ? ['Payable amount is unknown; this is not a zero-value receivable.']
      : ['Amount is remaining known payable after recorded payments.'],
  };
}

function buildExpenseActionItem(
  expense: DashboardExpenseRecord,
): DashboardActionItemDto {
  return {
    id: `${DashboardActionItemCategory.EXPENSE}:${expense.id}`,
    category: DashboardActionItemCategory.EXPENSE,
    severity: DashboardActionItemSeverity.CRITICAL,
    status: 'pending',
    title: `Pending expense: ${expense.name}`,
    entity: {
      type: 'expense',
      id: expense.id,
      label: expense.CostCenter
        ? `${expense.name} · ${expense.CostCenter.name}`
        : expense.name,
      href: null,
    },
    dueAt: formatDateOnly(expense.expectedAt),
    amount: expense.amount,
    riskFlags: [],
    dateBasis: DashboardActionItemDateBasis.EXPECTED_AT,
    notes: ['Anchored to expectedAt and included only while paidAt is null.'],
  };
}

function buildLowStockActionItem(
  item: LowStockActionInventoryItem,
): DashboardActionItemDto {
  return {
    id: `${DashboardActionItemCategory.LOW_STOCK}:${item.id}`,
    category: DashboardActionItemCategory.LOW_STOCK,
    severity: DashboardActionItemSeverity.MEDIUM,
    status: 'low-stock',
    title: `Low stock: ${item.name}`,
    entity: {
      type: 'inventoryItem',
      id: item.id,
      label: `${item.name} · stock ${item.currentStock}/${item.minimumStock}`,
      href: null,
    },
    dueAt: null,
    amount: item.currentStock,
    riskFlags: [],
    dateBasis: DashboardActionItemDateBasis.STOCK_AS_OF_TO,
    notes: ['Stock is calculated from movements up to range.to.'],
  };
}

function buildPriceRiskActionItem(
  item: LowStockActionInventoryItem,
): DashboardActionItemDto {
  return {
    id: `${DashboardActionItemCategory.PRICE_RISK}:${item.id}`,
    category: DashboardActionItemCategory.PRICE_RISK,
    severity: DashboardActionItemSeverity.INFO,
    status: 'advisory',
    title: `Unknown price risk: ${item.name}`,
    entity: {
      type: 'inventoryItem',
      id: item.id,
      label: item.name,
      href: null,
    },
    dueAt: null,
    amount: null,
    riskFlags: ['unknownPrice'],
    dateBasis: DashboardActionItemDateBasis.ACTIVE_QUOTE_STATE_AS_OF_TO,
    notes: [
      'No active/default price signal was found as of range.to; this is advisory, not a loss estimate.',
    ],
  };
}

function buildCashRiskActionItems(input: {
  collected: number;
  expenses: DashboardExpenseRecord[];
  payroll: { grandTotal: number | null } | null;
}): DashboardActionItemDto[] {
  const knownPressure =
    sumAmounts(input.expenses) + (input.payroll?.grandTotal ?? 0);

  if (knownPressure <= input.collected) {
    return [];
  }

  return [
    {
      id: `${DashboardActionItemCategory.CASH_RISK}:selected-range`,
      category: DashboardActionItemCategory.CASH_RISK,
      severity: DashboardActionItemSeverity.INFO,
      status: 'advisory',
      title: 'Possible cash pressure in selected range',
      entity: {
        type: 'dashboard',
        id: 'selected-range',
        label: 'Selected dashboard range',
        href: null,
      },
      dueAt: null,
      amount: null,
      riskFlags: ['cashPressureApproximate'],
      dateBasis:
        DashboardActionItemDateBasis.SELECTED_RANGE_COLLECTIONS_VS_PENDING_EXPENSES,
      notes: [
        'Advisory only: selected-range collections are below known pending expenses/payroll pressure.',
        'This is not a ledger-grade cash forecast.',
      ],
    },
  ];
}

function buildWorkOrderEntity(workOrder: DashboardWorkOrderRecord) {
  return {
    type: 'workOrder',
    id: workOrder.id,
    label: `OT ${workOrder.number} · ${workOrder.Customer?.name ?? 'Sin cliente'}`,
    href: workOrder.externalLink ?? null,
  };
}

type LowStockActionInventoryItem = DashboardActionInventoryItemRecord & {
  currentStock: number;
};

function findLowStockActionItems(items: DashboardActionInventoryItemRecord[]) {
  return items
    .map((item) => ({
      ...item,
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

function hasUnknownPriceRisk(item: LowStockActionInventoryItem) {
  const hasActiveQuote = item.SupplierQuoteHistory.some(
    (quote) => quote.status === 'ACTIVE' && quote.quotedCost > 0,
  );

  return item.defaultSalePrice === null && !hasActiveQuote;
}

function sortActionItems(items: DashboardActionItemDto[]) {
  return [...items].sort((left, right) => {
    const severityDiff =
      severityRank(left.severity) - severityRank(right.severity);

    if (severityDiff !== 0) {
      return severityDiff;
    }

    const dueDiff = toDueTime(left.dueAt) - toDueTime(right.dueAt);

    if (dueDiff !== 0) {
      return dueDiff;
    }

    const categoryDiff =
      categoryRank(left.category) - categoryRank(right.category);

    if (categoryDiff !== 0) {
      return categoryDiff;
    }

    return left.id.localeCompare(right.id);
  });
}

function categoryRank(category: DashboardActionItemCategory) {
  return {
    [DashboardActionItemCategory.WORK_ORDER_OVERDUE]: 0,
    [DashboardActionItemCategory.EXPENSE]: 1,
    [DashboardActionItemCategory.RECEIVABLE]: 2,
    [DashboardActionItemCategory.LOW_STOCK]: 3,
    [DashboardActionItemCategory.PRICE_RISK]: 4,
    [DashboardActionItemCategory.CASH_RISK]: 5,
  }[category];
}

function severityRank(severity: DashboardActionItemSeverity) {
  return {
    [DashboardActionItemSeverity.CRITICAL]: 0,
    [DashboardActionItemSeverity.HIGH]: 1,
    [DashboardActionItemSeverity.MEDIUM]: 2,
    [DashboardActionItemSeverity.INFO]: 3,
  }[severity];
}

function toDueTime(value: string | null) {
  return value ? Date.parse(`${value}T00:00:00.000Z`) : Number.MAX_SAFE_INTEGER;
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
