import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListCustomersQueryDto } from './list-customers-query.dto';

describe('ListCustomersQueryDto', () => {
  it('accepts allowlisted sorting and applies default sorting', () => {
    const defaultQuery = plainToInstance(ListCustomersQueryDto, {});
    const sortedQuery = plainToInstance(ListCustomersQueryDto, {
      sortBy: 'name',
      sortDir: 'asc',
    });

    expect(validateSync(defaultQuery)).toHaveLength(0);
    expect(defaultQuery.sortBy).toBe('createdAt');
    expect(defaultQuery.sortDir).toBe('desc');
    expect(validateSync(sortedQuery)).toHaveLength(0);
  });

  it('rejects unsupported sort fields and directions', () => {
    const query = plainToInstance(ListCustomersQueryDto, {
      sortBy: 'balance',
      sortDir: 'up',
    });

    const errors = validateSync(query);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'sortBy' }),
        expect.objectContaining({ property: 'sortDir' }),
      ]),
    );
  });
});
