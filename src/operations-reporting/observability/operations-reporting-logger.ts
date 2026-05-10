type LoggerRange = {
  dateFrom?: Date;
  dateTo?: Date;
};

type SafeLoggerValue = string | number | boolean | null | undefined | Date;

const blockedFilterKeys = new Set([
  'cookie',
  'cookies',
  'customerName',
  'notes',
  'password',
  'payload',
  'token',
]);

export function buildSafeReportLoggerContext(
  reportName: string,
  filters: Record<string, unknown>,
  range: LoggerRange,
) {
  return {
    reportName,
    filters: Object.fromEntries(
      Object.entries(filters)
        .filter(([key, value]) => isSafeFilterEntry(key, value))
        .map(([key, value]) => [key, serializeSafeFilterValue(value)]),
    ),
    window: {
      dateFrom: range.dateFrom?.toISOString() ?? null,
      dateTo: range.dateTo?.toISOString() ?? null,
    },
  };
}

function isSafeFilterEntry(key: string, value: unknown): value is SafeLoggerValue {
  return !blockedFilterKeys.has(key) && isSafeFilterValue(value);
}

function isSafeFilterValue(value: unknown): value is SafeLoggerValue {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof Date
  );
}

function serializeSafeFilterValue(value: SafeLoggerValue) {
  return value instanceof Date ? value.toISOString() : value;
}
