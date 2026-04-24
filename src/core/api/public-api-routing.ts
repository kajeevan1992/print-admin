import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from './public-api-auth';
import type { CatalogResource } from '../catalog/catalog-store';
import { listInternalCatalog } from '../catalog/internal-catalog.service';

export function readListParams(request: Request) {
  const url = new URL(request.url);
  const rawPage = Number(url.searchParams.get('page') || 1);
  const rawLimit = Number(url.searchParams.get('limit') || 50);
  const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
  const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 50;
  return { search: url.searchParams.get('search') || undefined, page, limit };
}

export async function publicCatalogList(request: Request, resource: CatalogResource) {
  const auth = requirePublicApiCredentials(request, ['catalog:read']);
  if (!auth.ok) return auth.response;
  const data = await listInternalCatalog({ tenantId: auth.context.tenantId, siteId: auth.context.siteId }, resource, readListParams(request));
  return NextResponse.json({ ok: true, api: 'public', version: 'v1', resource, data });
}

export function publicJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ ok: true, api: 'public', version: 'v1', data }, init);
}

export function publicFail(error: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, error, message }, { status });
}
