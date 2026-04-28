export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const DRAFT_ORDER_KEY = 'quote-draft-orders';
const ORDER_PIPELINE_KEY = 'storefront-order-pipeline';

type DraftOrderRecord = Record<string, any> & {
  id?: string;
  quoteReference?: string;
  customerName?: string;
  customerEmail?: string;
  currency?: string;
  netTotalMinor?: number;
  vatTotalMinor?: number;
  grossTotalMinor?: number;
  payload?: Record<string, any>;
};

type PipelineOrderRecord = Record<string, any> & {
  id: string;
  orderNumber: string;
  draftOrderId: string;
  status: string;
};

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Order pipeline request failed.' }, { status });
}

function makeId(prefix = 'pipeline-order') {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
}

function makeOrderNumber() {
  return `ORD-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
}

async function readConfigItems<T>(request: NextRequest, key: string): Promise<T[]> {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key);
    const items = (record as any)?.metadataJson?.items;
    return Array.isArray(items) ? items : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}

async function saveConfigItems(request: NextRequest, key: string, name: string, description: string, items: unknown[], source: string) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: key,
    slug: key,
    name,
    description,
    metadataJson: {
      items,
      savedAt: new Date().toISOString(),
      storageKey: key,
      source,
    },
  } as any);
}

function draftTotals(draft: DraftOrderRecord) {
  const payloadTotals = draft.payload?.totals || {};
  return {
    currency: String(draft.currency || payloadTotals.currency || draft.payload?.currency || 'GBP'),
    netTotalMinor: Number(draft.netTotalMinor ?? payloadTotals.netTotalMinor ?? 0),
    vatTotalMinor: Number(draft.vatTotalMinor ?? payloadTotals.vatTotalMinor ?? 0),
    grossTotalMinor: Number(draft.grossTotalMinor ?? payloadTotals.grossTotalMinor ?? 0),
  };
}

function normalisePipelineOrder(draft: DraftOrderRecord): PipelineOrderRecord {
  const now = new Date().toISOString();
  const totals = draftTotals(draft);
  const payload = draft.payload || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  const customer = payload.customer || {
    name: draft.customerName || '',
    email: draft.customerEmail || '',
    phone: draft.customerPhone || '',
    company: draft.customerCompany || '',
  };

  return {
    id: makeId(),
    orderNumber: makeOrderNumber(),
    draftOrderId: String(draft.id || ''),
    quoteReference: String(draft.quoteReference || payload.quoteReference || ''),
    status: 'order-received',
    pipelineStage: 'order-intake',
    paymentStatus: 'not-required-yet',
    productionStatus: 'awaiting-artwork-review',
    source: 'StorefrontTestDraftToOrderPipeline',
    customer,
    items,
    totals,
    artworkUploads: Array.isArray(payload.artworkUploads) ? payload.artworkUploads : items.flatMap((item: any) => item.artworkUploads || []),
    artworkStatus: payload.artworkStatus || (items.every((item: any) => Array.isArray(item.artworkUploads) && item.artworkUploads.length > 0) ? 'artwork-received' : 'missing-artwork'),
    turnaround: payload.turnaround || [],
    deliveryEstimate: payload.deliveryEstimate || [],
    auditTrail: [
      { status: 'draft-order-confirmed', at: draft.createdAt || now, source: 'checkout-draft' },
      { status: 'order-received', at: now, source: 'order-pipeline' },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export async function GET(request: NextRequest) {
  try {
    const items = await readConfigItems<PipelineOrderRecord>(request, ORDER_PIPELINE_KEY);
    return NextResponse.json({ ok: true, source: 'internal-order-pipeline-db', data: { items } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const draftOrderId = String(body.draftOrderId || '').trim();
    if (!draftOrderId) return responseError(new Error('draftOrderId is required.'), 400);

    const drafts = await readConfigItems<DraftOrderRecord>(request, DRAFT_ORDER_KEY);
    const draft = drafts.find((item) => String(item.id || '') === draftOrderId);
    if (!draft) return responseError(new Error('Draft order was not found.'), 404);

    const items = Array.isArray(draft.payload?.items) ? draft.payload.items : [];
    if (items.length === 0) return responseError(new Error('Draft order has no structured line items.'), 400);
    if (!draft.payload?.customer?.name || !draft.payload?.customer?.email) return responseError(new Error('Draft order customer details are incomplete.'), 400);
    if (items.some((item: any) => !item.pricing && !Number(item.grossTotalMinor || 0))) return responseError(new Error('Draft order line items must include pricing before order pipeline creation.'), 400);

    const existingOrders = await readConfigItems<PipelineOrderRecord>(request, ORDER_PIPELINE_KEY);
    const existing = existingOrders.find((item) => String(item.draftOrderId || '') === draftOrderId);
    if (existing) return NextResponse.json({ ok: true, source: 'internal-order-pipeline-db', item: existing, duplicate: true });

    const order = normalisePipelineOrder(draft);
    const record = await saveConfigItems(
      request,
      ORDER_PIPELINE_KEY,
      'Storefront order pipeline',
      'Order pipeline records generated from confirmed storefront checkout draft orders.',
      [order, ...existingOrders],
      'StorefrontOrderPipelineWorkflow',
    );

    const updatedDrafts = drafts.map((item) => String(item.id || '') === draftOrderId ? {
      ...item,
      status: 'order-received',
      pipelineOrderId: order.id,
      orderNumber: order.orderNumber,
      updatedAt: new Date().toISOString(),
    } : item);
    await saveConfigItems(
      request,
      DRAFT_ORDER_KEY,
      'Quote draft orders',
      'Draft order records generated from pricing/quote lab and storefront checkout payloads',
      updatedDrafts,
      'CheckoutDraftWorkflow',
    );

    return NextResponse.json({ ok: true, source: 'internal-order-pipeline-db', data: record, item: order });
  } catch (error) {
    return responseError(error);
  }
}
