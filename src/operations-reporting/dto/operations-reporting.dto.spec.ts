import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  EmployeeType,
  ExpenseCategory,
  PaymentStatus,
  WorkOrderStatus,
} from '../../../generated/prisma/enums';
import { ExpensesBreakdownReportQueryDto } from './expenses-breakdown-report-query.dto';
import { MechanicsProductivityReportQueryDto } from './mechanics-productivity-report-query.dto';
import { PendingPaymentsReportQueryDto } from './pending-payments-report-query.dto';
import { SummaryReportQueryDto } from './summary-report-query.dto';
import { WorkOrderProfitabilityReportQueryDto } from './work-order-profitability-report-query.dto';

describe('operations reporting DTO contracts', () => {
  it('rejects date ranges where dateFrom is after dateTo across shared report queries', async () => {
    const queries = [
      plainToInstance(SummaryReportQueryDto, {
        dateFrom: '2026-05-31T00:00:00.000Z',
        dateTo: '2026-05-01T00:00:00.000Z',
      }),
      plainToInstance(PendingPaymentsReportQueryDto, {
        dateFrom: '2026-05-31T00:00:00.000Z',
        dateTo: '2026-05-01T00:00:00.000Z',
      }),
      plainToInstance(WorkOrderProfitabilityReportQueryDto, {
        dateFrom: '2026-05-31T00:00:00.000Z',
        dateTo: '2026-05-01T00:00:00.000Z',
      }),
      plainToInstance(MechanicsProductivityReportQueryDto, {
        dateFrom: '2026-05-31T00:00:00.000Z',
        dateTo: '2026-05-01T00:00:00.000Z',
      }),
      plainToInstance(ExpensesBreakdownReportQueryDto, {
        dateFrom: '2026-05-31T00:00:00.000Z',
        dateTo: '2026-05-01T00:00:00.000Z',
      }),
    ];

    for (const query of queries) {
      expect(query.dateFrom).toBeInstanceOf(Date);
      expect(query.dateTo).toBeInstanceOf(Date);

      const errors = await validate(query);

      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('dateTo');
      expect(errors[0]?.constraints).toMatchObject({
        isDateRangeOrderValid: 'dateTo must be greater than or equal to dateFrom',
      });
    }
  });

  it('parses shared date filters plus route-specific enums and trimmed ids for reusable report queries', async () => {
    const summaryQuery = plainToInstance(SummaryReportQueryDto, {
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-31T23:59:59.000Z',
      status: WorkOrderStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
    });
    const pendingPaymentsQuery = plainToInstance(PendingPaymentsReportQueryDto, {
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-31T23:59:59.000Z',
      customerId: '  customer-1  ',
      paymentStatus: PaymentStatus.PARTIAL,
    });
    const profitabilityQuery = plainToInstance(
      WorkOrderProfitabilityReportQueryDto,
      {
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-05-31T23:59:59.000Z',
        assignedEmployeeId: '  employee-1  ',
      },
    );
    const mechanicsQuery = plainToInstance(MechanicsProductivityReportQueryDto, {
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-31T23:59:59.000Z',
      assignedEmployeeId: '  employee-2  ',
      employeeType: EmployeeType.MECHANIC,
      includeInactiveMechanics: 'true',
    });
    const expensesQuery = plainToInstance(ExpensesBreakdownReportQueryDto, {
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-31T23:59:59.000Z',
      costCenterId: '  cost-center-1  ',
      expenseCategory: ExpenseCategory.RENT,
      paymentStatus: PaymentStatus.PENDING,
    });
    const invalidExpensesQuery = plainToInstance(ExpensesBreakdownReportQueryDto, {
      paymentStatus: PaymentStatus.PARTIAL,
    });

    expect(summaryQuery.dateFrom).toBeInstanceOf(Date);
    expect(summaryQuery.dateTo).toBeInstanceOf(Date);
    expect(summaryQuery.status).toBe(WorkOrderStatus.COMPLETED);
    expect(summaryQuery.paymentStatus).toBe(PaymentStatus.PAID);
    await expect(validate(summaryQuery)).resolves.toHaveLength(0);

    expect(pendingPaymentsQuery.customerId).toBe('customer-1');
    expect(pendingPaymentsQuery.paymentStatus).toBe(PaymentStatus.PARTIAL);
    await expect(validate(pendingPaymentsQuery)).resolves.toHaveLength(0);

    expect(profitabilityQuery.assignedEmployeeId).toBe('employee-1');
    await expect(validate(profitabilityQuery)).resolves.toHaveLength(0);

    expect(mechanicsQuery.assignedEmployeeId).toBe('employee-2');
    expect(mechanicsQuery.employeeType).toBe(EmployeeType.MECHANIC);
    expect(mechanicsQuery.includeInactiveMechanics).toBe(true);
    await expect(validate(mechanicsQuery)).resolves.toHaveLength(0);

    expect(expensesQuery.costCenterId).toBe('cost-center-1');
    expect(expensesQuery.expenseCategory).toBe(ExpenseCategory.RENT);
    expect(expensesQuery.paymentStatus).toBe(PaymentStatus.PENDING);
    await expect(validate(expensesQuery)).resolves.toHaveLength(0);

    const invalidExpenseErrors = await validate(invalidExpensesQuery);

    expect(invalidExpenseErrors).toHaveLength(1);
    expect(invalidExpenseErrors[0]?.property).toBe('paymentStatus');
  });
});
