import { NextResponse } from 'next/server';
import { deleteInternalCatalogRecord, getInternalCatalogRecord, listInternalCatalog, writeInternalCatalogRecord } from './internal-catalog.service';
import { CatalogValidationError, normalizeSlugValue } from './catalog-validation';
import type { CatalogResource } from './catalog-store';
import { tenantContextFromRequest } from '../tenant/context';

type Body = Record<string, unknown>;

function readOptions(request: Request) {
  const url = new URL(request.url);
  return {
    search: url.searchParams.get('search') || undefined,
    page: Number(url.searchParams.get('page') || 1),
    limit: Number(url.searchParams.get('limit') || 50),
  };
}

async function readBody(request: Request): Promise<Body> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body as Body : {};
  } catch {
    return {};
  }
}

function getString(body: Body, key: string) {
  const value = body[key];
  return typeof value === 'string' ? value.trim() : undefined;
}

function toWriteInput(body: Body) {
  const metadataJson = body.metadataJson && typeof body.metadataJson === 'object' && !Array.isArray(body.metadataJson)
    ? body.metadataJson as Record<string, unknown>
    : undefined;

  return {
    id: getString(body, 'id'),
    slug: normalizeSlugValue(getString(body, 'slug') || getString(body, 'friendlyUrl')) || undefined,
    name: getString(body, 'name'),
    title: getString(body, 'title'),
    description: getString(body, 'description') || getString(body, 'subtitle'),
    metadataJson,
    categoryId: Object.prototype.hasOwnProperty.call(body, 'categoryId') ? getString(body, 'categoryId') || null : undefined,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    isGlobal: typeof body.isGlobal === 'boolean' ? body.isGlobal : undefined,
    priceFromMinor: Object.prototype.hasOwnProperty.call(body, 'priceFromMinor')
      ? typeof body.priceFromMinor === 'number' ? body.priceFromMinor : null
      : undefined,
    currency: getString(body, 'currency'),
    productType: getString(body, 'productType'),
  };
}

function inputWithId(body: Body, id?: string) {
  return {
    ...toWriteInput(body),
    id: id || getString(body, 'id'),
  };
}

function statusForError(message: string, fallback: number) {
  if (message.toLowerCase().includes('already exists')) return 409;
  if (message.toLowerCase().includes('friendly url') || message.toLowerCase().includes('must be') || message.toLowerCase().includes('choose an existing category')) return 400;
  if (message.toLowerCase().includes('requires')) return 400;
  if (message.toLowerCase().includes('not found')) return 404;
  return fallback;
}

function errorResponse(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : 'Catalog operation failed.';
  const issues = error instanceof CatalogValidationError ? error.issues : undefined;
  return NextResponse.json({ ok: false, source: 'internal-core', error: message, issues }, { status: statusForError(message, status) });
}

export async function handleCatalogGet(request: Request, resource: CatalogResource) {
  try {
    const data = await listInternalCatalog(tenantContextFromRequest(request), resource, readOptions(request));
    return NextResponse.json({ ok: true, source: 'internal-core-db', data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleCatalogWrite(request: Request, resource: CatalogResource) {
  try {
    const input = toWriteInput(await readBody(request));
    const method = request.method.toUpperCase();
    const mode = method === 'POST' ? 'create' : method === 'PATCH' || method === 'PUT' ? 'update' : 'upsert';
    const data = await writeInternalCatalogRecord(tenantContextFromRequest(request), resource, input, mode);
    return NextResponse.json({ ok: true, source: 'internal-core-db', mode, data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleCatalogDelete(request: Request, resource: CatalogResource) {
  try {
    const url = new URL(request.url);
    const body = await readBody(request);
    const id = url.searchParams.get('id') || getString(body, 'id');
    if (!id) return errorResponse(new Error('Catalog deletes require an id.'), 400);
    const data = await deleteInternalCatalogRecord(tenantContextFromRequest(request), resource, id);
    return NextResponse.json({ ok: true, source: 'internal-core-db', data });
  } catch (error) {
    return errorResponse(error);
  }
}


export async function handleCatalogItemGet(request: Request, resource: CatalogResource, id: string) {
  try {
    const data = await getInternalCatalogRecord(tenantContextFromRequest(request), resource, id);
    return NextResponse.json({ ok: true, source: 'internal-core-db', data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleCatalogItemWrite(request: Request, resource: CatalogResource, id: string) {
  try {
    const input = inputWithId(await readBody(request), id);
    const method = request.method.toUpperCase();
    const mode = method === 'POST' ? 'upsert' : 'update';
    const data = await writeInternalCatalogRecord(tenantContextFromRequest(request), resource, input, mode);
    return NextResponse.json({ ok: true, source: 'internal-core-db', mode, data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleCatalogItemDelete(request: Request, resource: CatalogResource, id: string) {
  try {
    const data = await deleteInternalCatalogRecord(tenantContextFromRequest(request), resource, id);
    return NextResponse.json({ ok: true, source: 'internal-core-db', data });
  } catch (error) {
    return errorResponse(error);
  }
}
