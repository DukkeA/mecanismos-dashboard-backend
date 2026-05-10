import { buildSafeReportLoggerContext } from './operations-reporting-logger';

describe('buildSafeReportLoggerContext', () => {
  it('keeps only safe scalar filters and ISO date windows', () => {
    expect(
      buildSafeReportLoggerContext(
        'pending-payments',
        {
          status: 'IN_PROGRESS',
          paymentStatus: 'PARTIAL',
          customerId: 'customer-1',
          includeInactiveMechanics: false,
          customerName: 'Cliente Uno',
          token: 'secret-token',
          cookies: 'md_access=abc',
          payload: { amount: 1000 } as never,
        },
        {
          dateFrom: new Date('2026-05-01T00:00:00.000Z'),
          dateTo: new Date('2026-05-31T23:59:59.000Z'),
        },
      ),
    ).toEqual({
      reportName: 'pending-payments',
      filters: {
        status: 'IN_PROGRESS',
        paymentStatus: 'PARTIAL',
        customerId: 'customer-1',
        includeInactiveMechanics: false,
      },
      window: {
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-05-31T23:59:59.000Z',
      },
    });
  });
});
