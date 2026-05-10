type ReportDateRange = {
  dateFrom?: Date;
  dateTo?: Date;
};

type WindowField =
  | 'createdAt'
  | 'expectedAt'
  | 'incurredAt'
  | 'paidAt';

export function buildInclusiveDateWindow(
  field: WindowField,
  range: ReportDateRange,
) {
  if (!range.dateFrom && !range.dateTo) {
    return {};
  }

  return {
    [field]: {
      ...(range.dateFrom ? { gte: range.dateFrom } : {}),
      ...(range.dateTo ? { lte: range.dateTo } : {}),
    },
  };
}

export function buildPaidExpenseWindow(range: ReportDateRange) {
  return {
    paidAt: {
      not: null,
      ...(range.dateFrom ? { gte: range.dateFrom } : {}),
      ...(range.dateTo ? { lte: range.dateTo } : {}),
    },
  };
}

export function buildPendingExpenseWindow(range: ReportDateRange) {
  return {
    paidAt: null,
    ...buildInclusiveDateWindow('expectedAt', range),
  };
}
