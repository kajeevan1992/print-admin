import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'storefront-contract-alias',
    data: {
      message: 'Compatibility endpoint is active.',
      canonical: '/api/internal/storefront/contract',
      compatibility: '/api/internal/catalog/storefront-contract',
      version: 'v309',
    },
  });
}

export async function POST() {
  return NextResponse.json({
    ok: true,
    source: 'storefront-contract-alias',
    data: {
      message: 'Compatibility endpoint is active.',
      canonical: '/api/internal/storefront/contract',
      version: 'v309',
    },
  });
}
