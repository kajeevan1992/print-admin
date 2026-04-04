import type { ApiResponse } from './types';
import type { PaginationMeta } from './pagination';

export type PaginatedResponse<T> = ApiResponse<{ items: T[] }> & { meta: PaginationMeta };

export const ok = <T>(data: T): ApiResponse<T> => ({ success: true, data });

export const okPaginated = <T>(items: T[], meta: PaginationMeta): PaginatedResponse<T> => ({
  success: true,
  data: { items },
  meta
});
