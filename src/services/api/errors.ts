export type ApiErrorCode = 'NOT_FOUND' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status: number,
    public details?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
