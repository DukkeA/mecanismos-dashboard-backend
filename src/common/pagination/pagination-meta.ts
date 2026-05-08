export type PaginationMetaInput = {
  page: number;
  limit: number;
  total: number;
};

export function buildPaginationMeta({
  page,
  limit,
  total,
}: PaginationMetaInput) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
