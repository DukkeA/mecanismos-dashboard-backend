type LoggerRange = {
  dateFrom?: Date;
  dateTo?: Date;
};

type SafeLoggerValue = string | number | boolean | null | undefined | Date;
type SafeLoggerFilters = Record<string, ReturnType<typeof serializeSafeFilterValue>>;

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
  filters: object,
  range: LoggerRange,
) {
  const safeFilters: SafeLoggerFilters = {};

  for (const [key, value] of Object.entries(filters)) {
    if (isSafeFilterEntry(key, value)) {
      safeFilters[key] = serializeSafeFilterValue(value);
    }
  }

  return {
    reportName,
    filters: safeFilters,
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
