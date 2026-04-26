export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const DRAFT_ORDER_KEY = 'quote-draft-orders';

type DraftOrderRecord = Record<string, unknown> & {
  id?: string;
  title?: string;
  name?: string;
  status?: string;
  payload?: any;
};

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Draft order request failed.' }, { status });
}

function makeId(prefix = 'draft-order') {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
}

function normaliseDraft(body: DraftOrderRecord): DraftOrderRecord {
  const payload = body.payload || body.orderPayload || body;
  const quoteReference = String(payload?.quoteReference || body.quoteReference || '').trim();
  const productName = String(payload?.productName || body.productName || 'Draft order').trim();
  const customerName = String(payload?.customerName || body.customerName || '').trim();
  const now = new Date().toISOString();
  const id = String(body.id || makeId());
  const title = String(body.title || body.name || [quoteReference || id, productName, customerName].filter(Boolean).join(' - '));

  return {
    ...body,
    id,
    title,
    name: title,
    status: String(body.status || payload?.status || 'draft-order'),
    quoteReference,
    productName,
    customerName,
    grossTotalMinor: payload?.pricing?.grossTotalMinor || body.grossTotalMinor || 0,
    currency: payload?.currency || body.currency || 'GBP',
    payload,
    createdAt: body.createdAt || now,
    updatedAt: now,
    source: 'PrintMathsLabQuoteToOrder',
  };
}

async function readDrafts(request: NextRequest): Promise<DraftOrderRecord[]> {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, DRAFT_ORDER_KEY);
    const items = (record as any)?.metadataJson?.items;
    return Array.isArray(items) ? items : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}

async function saveDrafts(request: NextRequest, items: DraftOrderRecord[]) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: DRAFT_ORDER_KEY,
    slug: DRAFT_ORDER_KEY,
    name: 'Quote draft orders',
    description: 'Draft order records generated from pricing/quote lab payloads',
    metadataJson: {
      items,
      savedAt: new Date().toISOString(),
      storageKey: DRAFT_ORDER_KEY,
      source: 'QuoteToOrderDraftWorkflow',
    },
  } as any);
}

export async function GET(request: NextRequest) {
  try {
    const items = await readDrafts(request);
    return NextResponse.json({ ok: true, source: 'internal-draft-orders-db', data: { items } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const draft = normaliseDraft(body);
    const items = await readDrafts(request);
    const next = [draft, ...items.filter((item) => String(item.id) !== String(draft.id))];
    const record = await saveDrafts(request, next);
    return NextResponse.json({ ok: true, source: 'internal-draft-orders-db', data: record, item: draft });
  } catch (error) {
    return responseError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return responseError(new Error('Draft order id is required.'), 400);
    const items = await readDrafts(request);
    const next = items.filter((item) => String(item.id) !== String(id));
    const record = await saveDrafts(request, next);
    return NextResponse.json({ ok: true, source: 'internal-draft-orders-db', data: record, deletedId: id });
  } catch (error) {
    return responseError(error);
  }
}
