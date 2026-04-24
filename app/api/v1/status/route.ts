import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';

export async function GET(request: Request) {
  const auth = requirePublicApiCredentials(request);
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    ok: true,
    api: 'public',
    version: 'v1',
    authenticated: true,
    message: 'API credentials accepted by the public API gateway foundation.',
  });
}
