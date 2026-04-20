import { NextResponse } from 'next/server';
import type { ApiError, ApiSuccess } from '@/types/api-contracts';

export function ok<T>(data: T, init?: ResponseInit) {
  const body: ApiSuccess<T> = { ok: true, data };
  return NextResponse.json(body, init);
}

export function fail(code: string, message: string, status = 400) {
  const body: ApiError = {
    ok: false,
    error: { code, message },
  };
  return NextResponse.json(body, { status });
}
