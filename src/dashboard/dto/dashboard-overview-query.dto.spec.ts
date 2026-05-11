import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DashboardOverviewQueryDto } from './dashboard-overview-query.dto';

describe('DashboardOverviewQueryDto', () => {
  it('accepts optional open-ended from/to bounds and parses valid dates', async () => {
    const emptyQuery = plainToInstance(DashboardOverviewQueryDto, {});
    const fromOnlyQuery = plainToInstance(DashboardOverviewQueryDto, {
      from: '2026-05-01T00:00:00.000Z',
    });
    const toOnlyQuery = plainToInstance(DashboardOverviewQueryDto, {
      to: '2026-05-31T23:59:59.999Z',
    });
    const fullQuery = plainToInstance(DashboardOverviewQueryDto, {
      from: '2026-05-01T00:00:00.000Z',
      to: '2026-05-31T23:59:59.999Z',
    });

    await expect(validate(emptyQuery)).resolves.toHaveLength(0);
    await expect(validate(fromOnlyQuery)).resolves.toHaveLength(0);
    await expect(validate(toOnlyQuery)).resolves.toHaveLength(0);
    await expect(validate(fullQuery)).resolves.toHaveLength(0);

    expect(fromOnlyQuery.from).toBeInstanceOf(Date);
    expect(toOnlyQuery.to).toBeInstanceOf(Date);
    expect(fullQuery.from?.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(fullQuery.to?.toISOString()).toBe('2026-05-31T23:59:59.999Z');
  });

  it('rejects invalid dates and reversed ranges', async () => {
    const invalidDateQuery = plainToInstance(DashboardOverviewQueryDto, {
      from: 'not-a-date',
    });
    const reversedQuery = plainToInstance(DashboardOverviewQueryDto, {
      from: '2026-05-31T00:00:00.000Z',
      to: '2026-05-01T00:00:00.000Z',
    });

    const invalidDateErrors = await validate(invalidDateQuery);
    const reversedErrors = await validate(reversedQuery);

    expect(invalidDateErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'from' }),
      ]),
    );
    expect(reversedErrors).toHaveLength(1);
    expect(reversedErrors[0]?.property).toBe('to');
    expect(reversedErrors[0]?.constraints).toMatchObject({
      isDateRangeOrderValid: 'to must be greater than or equal to from',
    });
  });
});
