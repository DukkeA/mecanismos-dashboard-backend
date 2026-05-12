import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DashboardActionItemsQueryDto } from './dashboard-action-items-query.dto';

describe('DashboardActionItemsQueryDto', () => {
  const validationPipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  it('accepts canonical date-only bounds and exposes parsed inclusive dates', async () => {
    const query = plainToInstance(DashboardActionItemsQueryDto, {
      from: '2026-05-01',
      to: '2026-05-31',
    });

    await expect(validate(query)).resolves.toHaveLength(0);
    expect(query.from?.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(query.to?.toISOString()).toBe('2026-05-31T00:00:00.000Z');
  });

  it('keeps overview-style open bounds optional for shell compatibility', async () => {
    const emptyQuery = plainToInstance(DashboardActionItemsQueryDto, {});
    const fromOnlyQuery = plainToInstance(DashboardActionItemsQueryDto, {
      from: '2026-05-01',
    });
    const toOnlyQuery = plainToInstance(DashboardActionItemsQueryDto, {
      to: '2026-05-31',
    });

    await expect(validate(emptyQuery)).resolves.toHaveLength(0);
    await expect(validate(fromOnlyQuery)).resolves.toHaveLength(0);
    await expect(validate(toOnlyQuery)).resolves.toHaveLength(0);
  });

  it('rejects invalid dates and reversed ranges', async () => {
    const invalidDateQuery = plainToInstance(DashboardActionItemsQueryDto, {
      from: '2026-02-31',
      to: '2026-05-31',
    });
    const reversedQuery = plainToInstance(DashboardActionItemsQueryDto, {
      from: '2026-06-01',
      to: '2026-05-31',
    });

    const invalidDateErrors = await validate(invalidDateQuery);
    const reversedErrors = await validate(reversedQuery);

    expect(invalidDateErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'from' })]),
    );
    expect(reversedErrors).toHaveLength(1);
    expect(reversedErrors[0]?.property).toBe('to');
    expect(reversedErrors[0]?.constraints).toMatchObject({
      isActionItemsDateRangeOrderValid:
        'to must be greater than or equal to from',
    });
  });

  it('rejects unsupported period query shortcuts through the route validation pipe', async () => {
    const query = { period: 'month', from: '2026-05-01', to: '2026-05-31' };

    await expect(
      validationPipe.transform(query, {
        type: 'query',
        metatype: DashboardActionItemsQueryDto,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
