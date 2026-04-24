import { NextResponse } from 'next/server';

export type PublicApiAuthResult =
  | { ok: true; apiKey: string; apiSecret: string }
  | { ok: false; response: NextResponse };

export function requirePublicApiCredentials(request: Request): PublicApiAuthResult {
  const apiKey = request.headers.get('x-api-key') || '';
  const apiSecret = request.headers.get('x-api-secret') || '';

  if (!apiKey || !apiSecret) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: 'API_CREDENTIALS_REQUIRED',
          message: 'Public API requests require x-api-key and x-api-secret headers.',
        },
        { status: 401 }
      ),
    };
  }

  return { ok: true, apiKey, apiSecret };
}
