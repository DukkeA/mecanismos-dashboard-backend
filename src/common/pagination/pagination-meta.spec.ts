import { buildPaginationMeta } from './pagination-meta';

describe('buildPaginationMeta', () => {
  it('returns page, limit, total, and totalPages for non-empty collections', () => {
    expect(buildPaginationMeta({ page: 2, limit: 5, total: 9 })).toEqual({
      page: 2,
      limit: 5,
      total: 9,
      totalPages: 2,
    });
  });

  it('preserves the current zero-total behavior used by list endpoints', () => {
    expect(buildPaginationMeta({ page: 1, limit: 10, total: 0 })).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
  });
});
