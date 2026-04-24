export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord, deleteInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;

function cleanKey(value: string) {
  return decodeURIComponent(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, '-')
    .slice(0, 120);
}

function responseError(error: unknown, status = 500) {
  return NextResponse.json(
    { ok: false, error: error instanceof Error ? error.message : 'Configuration request failed.' },
    { status }
  );
}

export async function GET(request: NextRequest, { params }: { params: { key: string } }) {
  const key = cleanKey(params.key);
  if (!key) return responseError(new Error('Configuration key is required.'), 400);

  try {
    const item = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key);
    return NextResponse.json({ ok: true, source: 'internal-config-db', key, data: item });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) {
      return NextResponse.json({ ok: true, source: 'internal-config-db', key, data: null });
    }
    return responseError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: { key: string } }) {
  const key = cleanKey(params.key);
  if (!key) return responseError(new Error('Configuration key is required.'), 400);

  try {
    const body = await request.json().catch(() => ({}));
    const values = body?.values && typeof body.values === 'object' ? body.values : {};
    const title = typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : key;
    const savedAt = new Date().toISOString();

    const item = await upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
      id: key,
      slug: key,
      name: title,
      description: typeof body?.description === 'string' ? body.description : 'Admin configuration workspace values',
      metadataJson: {
        values,
        savedAt,
        storageKey: key,
        title,
        source: 'ConfigWorkspacePage',
      },
    } as any);

    return NextResponse.json({ ok: true, source: 'internal-config-db', key, data: item });
  } catch (error) {
    return responseError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { key: string } }) {
  const key = cleanKey(params.key);
  if (!key) return responseError(new Error('Configuration key is required.'), 400);

  try {
    const result = await deleteInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key);
    return NextResponse.json({ ok: true, source: 'internal-config-db', key, data: result });
  } catch (error) {
    return responseError(error);
  }
}
