export const CUSTOMER_LIST_SORT_FIELDS = [
  'name',
  'documentNumber',
  'phone',
  'email',
  'createdAt',
  'updatedAt',
] as const;

export type CustomerListSortField = (typeof CUSTOMER_LIST_SORT_FIELDS)[number];

export const CUSTOMER_LIST_SORT_DIRECTIONS = ['asc', 'desc'] as const;

export type CustomerListSortDirection =
  (typeof CUSTOMER_LIST_SORT_DIRECTIONS)[number];

export const DEFAULT_CUSTOMER_LIST_SORT = {
  sortBy: 'createdAt',
  sortDir: 'desc',
} as const satisfies {
  sortBy: CustomerListSortField;
  sortDir: CustomerListSortDirection;
};
