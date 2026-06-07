import { NextResponse } from 'next/server';
import { deleteInternalCatalogRecord, getInternalCatalogRecord, listInternalCatalog, writeInternalCatalogRecord } from './internal-catalog.service';
import { CatalogValidationError, normalizeSlugValue } from './catalog-validation';
import type { CatalogResource } from './catalog-store';
import { tenantContextFromRequest } from '../tenant/context';
import { saveSeoRedirect } from '../seo/seo-redirects.service';

 type Body = Record<string, unknown>;

type RedirectAutomationResult = {
  checked: boolean;
  created: boolean;
  resource?: CatalogResource;
  fromPath?: string;
  toPath?: string;
  statusCode?: 301;
  error?: string;
};

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

function slugOf(record: unknown) {
  const value = record && typeof record === 'object' ? (record as Record<string, unknown>).slug : undefined;
  return typeof value === 'string' ? normalizeSlugValue(value) : undefined;
}

function titleOf(record: unknown) {
  if (!record || typeof record !== 'object') return '';
  const item = record as Record<string, unknown>;
  return String(item.title || item.name || item.slug || '').trim();
}

function publicPathFor(resource: CatalogResource, slug?: string) {
  const clean = normalizeSlugValue(slug);
  if (!clean) return '';
  if (resource === 'products') return `/${clean}`;
  if (resource === 'categories') return `/category/${clean}`;
  return '';
}

function shouldAutoCreateRedirect(body: Body) {
  if (body.createSlugRedirect === false) return false;
  if (body.createRedirectOnSlugChange === false) return false;
  if (body.skipSlugRedirect === true) return false;
  const metadata = body.metadataJson;
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    if ((metadata as Record<string, unknown>).createSlugRedirect === false) return false;
    if ((metadata as Record<string, unknown>).skipSlugRedirect === true) return false;
  }
  return true;
}

async function readBeforeForSlugRedirect(request: Request, resource: CatalogResource, body: Body, mode: string) {
  if (!['products', 'categories'].includes(resource)) return null;
  if (mode === 'create') return null;
  const ctx = tenantContextFromRequest(request);
  const idOrSlug = getString(body, 'id') || getString(body, 'previousSlug') || getString(body, 'oldSlug');
  if (!idOrSlug) return null;
  try {
    return await getInternalCatalogRecord(ctx, resource, idOrSlug);
  } catch {
    return null;
  }
}

async function maybeCreateSlugRedirect(request: Request, resource: CatalogResource, body: Body, before: unknown, after: unknown): Promise<RedirectAutomationResult> {
  if (!['products', 'categories'].includes(resource)) return { checked: false, created: false };
  if (!shouldAutoCreateRedirect(body)) return { checked: true, created: false, resource };
  const oldSlug = slugOf(before);
  const newSlug = slugOf(after);
  if (!oldSlug || !newSlug || oldSlug === newSlug) return { checked: true, created: false, resource };
  const fromPath = publicPathFor(resource, oldSlug);
  const toPath = publicPathFor(resource, newSlug);
  if (!fromPath || !toPath || fromPath === toPath) return { checked: true, created: false, resource };
  try {
    await saveSeoRedirect(request, {
      fromPath,
      toPath,
      statusCode: 301,
      isActive: true,
      note: `${resource === 'products' ? 'Product' : 'Category'} slug changed from ${oldSlug} to ${newSlug}${titleOf(after) ? ` for ${titleOf(after)}` : ''}. Auto-created by Build 41.`,
    });
    return { checked: true, created: true, resource, fromPath, toPath, statusCode: 301 };
  } catch (error) {
    return { checked: true, created: false, resource, fromPath, toPath, statusCode: 301, error: error instanceof Error ? error.message : 'Redirect creation failed.' };
  }
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
    const body = await readBody(request);
    const input = toWriteInput(body);
    const method = request.method.toUpperCase();
    const mode = method === 'POST' ? 'create' : method === 'PATCH' || method === 'PUT' ? 'update' : 'upsert';
    const before = await readBeforeForSlugRedirect(request, resource, body, mode);
    const data = await writeInternalCatalogRecord(tenantContextFromRequest(request), resource, input, mode);
    const redirectAutomation = await maybeCreateSlugRedirect(request, resource, body, before, data);
    return NextResponse.json({ ok: true, source: 'internal-core-db', mode, data, redirectAutomation });
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
    const body = await readBody(request);
    const input = inputWithId(body, id);
    const method = request.method.toUpperCase();
    const mode = method === 'POST' ? 'upsert' : 'update';
    const before = await readBeforeForSlugRedirect(request, resource, { ...body, id }, mode);
    const data = await writeInternalCatalogRecord(tenantContextFromRequest(request), resource, input, mode);
    const redirectAutomation = await maybeCreateSlugRedirect(request, resource, body, before, data);
    return NextResponse.json({ ok: true, source: 'internal-core-db', mode, data, redirectAutomation });
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
