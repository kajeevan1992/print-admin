import { NextResponse } from 'next/server';
import { handleCatalogDelete, handleCatalogGet } from '@/core/catalog/internal-catalog-http';
import { getInternalCatalogRecord, writeInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { normalizeSlugValue } from '@/core/catalog/catalog-validation';
import { verifiedTenantContextFromRequest } from '@/core/tenant/context';

export const dynamic = 'force-dynamic';

const resource = 'shipping-methods' as const;

function clean(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
async function bodyOf(request: Request) { try { const body = await request.json(); return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, any> : {}; } catch { return {}; } }
function errorResponse(error: unknown, status = 500) { return NextResponse.json({ ok: false, source: 'internal-core', error: error instanceof Error ? error.message : 'Shipping method operation failed.' }, { status }); }

async function write(request: Request, mode: 'create' | 'update' | 'upsert') {
  try {
    const body = await bodyOf(request);
    const ctx = await verifiedTenantContextFromRequest(request);
    const idOrSlug = clean(body.id) || clean(body.slug);
    let existing: any = null;
    if (mode !== 'create' && idOrSlug) existing = await getInternalCatalogRecord(ctx, resource, idOrSlug).catch(() => null);
    const incomingMetadata = body.metadataJson && typeof body.metadataJson === 'object' && !Array.isArray(body.metadataJson) ? body.metadataJson : {};
    const existingMetadata = existing?.metadataJson && typeof existing.metadataJson === 'object' ? existing.metadataJson : {};
    const slug = normalizeSlugValue(clean(body.slug) || clean(existing?.slug) || clean(body.name) || clean(body.title));
    const data = await writeInternalCatalogRecord(ctx, resource, {
      id: clean(body.id) || clean(existing?.id) || undefined,
      slug: slug || undefined,
      name: clean(body.name) || clean(body.title) || clean(existing?.name) || slug,
      title: clean(body.title) || clean(body.name) || clean(existing?.name) || slug,
      description: clean(body.description) || clean(existing?.description),
      metadataJson: { ...existingMetadata, ...incomingMetadata },
    }, mode);
    return NextResponse.json({ ok: true, source: 'internal-core-db', mode, data });
  } catch (error) { return errorResponse(error, mode === 'create' ? 400 : 500); }
}

export async function GET(request: Request) { return handleCatalogGet(request, resource); }
export async function POST(request: Request) { return write(request, 'create'); }
export async function PUT(request: Request) { return write(request, 'update'); }
export async function PATCH(request: Request) { return write(request, 'update'); }
export async function DELETE(request: Request) { return handleCatalogDelete(request, resource); }
