import { NextResponse } from 'next/server';
import { listInternalCatalog } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || undefined;
  const page = Number(url.searchParams.get('page') || 1);
  const limit = Number(url.searchParams.get('limit') || 50);

  const data = await listInternalCatalog(tenantContextFromRequest(request), 'categories', { search, page, limit });

  return NextResponse.json({
    ok: true,
    source: 'internal-core',
    data,
  });
}
