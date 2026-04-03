import { ApiError } from './errors';
import { ok } from './responses';
import type { ApiResponse } from './types';

const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

export const apiClient = {
  request: async <T>(handler: () => T | Promise<T>, latency = 180): Promise<ApiResponse<T>> => {
    await delay(latency);
    try {
      const data = await handler();
      return ok(data);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('UNKNOWN_ERROR', 'Unexpected mock API error', 500);
    }
  }
};
