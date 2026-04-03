import type { PaginationMeta, PaginationParams } from './pagination';

export type SortDirection = 'asc' | 'desc';

export type SortParams<TSortBy extends string = string> = {
  sortBy?: TSortBy;
  sortDirection?: SortDirection;
};

export type FilterParams = Record<string, string | number | boolean | undefined>;

export type ListQueryParams<TSortBy extends string = string, TFilters extends FilterParams = FilterParams> =
  PaginationParams &
  SortParams<TSortBy> &
  TFilters;

export type ApiResponse<T> = {
  success: true;
  data: T;
  meta?: PaginationMeta;
};
