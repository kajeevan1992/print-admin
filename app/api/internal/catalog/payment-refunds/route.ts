export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const LEDGER_KEY = 'storefront-finance-ledger';
const PAYMENT_KEY = 'storefront-payment-intents';
const REFUND_KEY = 'storefront-payment-refunds';
const CREDIT_KEY = 'storefront-customer-credit-requests';
const COMMUNICATION_KEY = 'storefront-customer-communication-log';

type RefundStore = { items: any[]; actions: any[] };

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Payment refund operation failed.' }, { status });
}

async function readRecord(request: NextRequest, key: string) {
  try {
    return await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return null;
    throw error;
  }
}

async function readLedger(request: NextRequest) {
  const record = await readRecord(request, LEDGER_KEY);
  const ledger = (record as any)?.metadataJson?.ledger || {};
  return {
    invoices: Array.isArray(ledger.invoices) ? ledger.invoices : [],
    payments: Array.isArray(ledger.payments) ? ledger.payments : [],
    vatSnapshots: Array.isArray(ledger.vatSnapshots) ? ledger.vatSnapshots : [],
  };
}

async function saveLedger(request: NextRequest, ledger: any) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: LEDGER_KEY,
    slug: LEDGER_KEY,
    name: 'Storefront finance ledger',
    description: 'Invoice, payment tracking and VAT reporting foundation for internal storefront orders. No gateway money movement.',
    metadataJson: { ledger, savedAt: new Date().toISOString(), storageKey: LEDGER_KEY, source: 'StorefrontFinanceLedger' },
  } as any);
}

async function readPaymentStore(request: NextRequest) {
  const record = await readRecord(request, PAYMENT_KEY);
  const store = (record as any)?.metadataJson?.store || {};
  return {
    intents: Array.isArray(store.intents) ? store.intents : [],
    events: Array.isArray(store.events) ? store.events : [],
  };
}

async function readConfigItems<T>(request: NextRequest, key: string): Promise<T[]> {
  const record = await readRecord(request, key);
  const items = (record as any)?.metadataJson?.items;
  return Array.isArray(items) ? items : [];
}

async function saveConfigItems(request: NextRequest, key: string, name: string, description: string, items: unknown[], source: string) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: key,
    slug: key,
    name,
    description,
    metadataJson: { items, savedAt: new Date().toISOString(), storageKey: key, source },
  } as any);
}

async function readRefundStore(request: NextRequest): Promise<RefundStore> {
  const record = await readRecord(request, REFUND_KEY);
  const store = (record as any)?.metadataJson?.store || {};
  return {
    items: Array.isArray(store.items) ? store.items : [],
    actions: Array.isArray(store.actions) ? store.actions : [],
  };
}

async function saveRefundStore(request: NextRequest, store: RefundStore) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: REFUND_KEY,
    slug: REFUND_KEY,
    name: 'Storefront payment refunds',
    description: 'Internal refund and reversal tracking linked to invoices and captured payment records. No live gateway money movement.',
    metadataJson: { store, savedAt: new Date().toISOString(), storageKey: REFUND_KEY, source: 'StorefrontPaymentRefunds' },
  } as any);
}

async function logCommunication(request: NextRequest, item: any, action: string) {
  const items = await readConfigItems<any>(request, COMMUNICATION_KEY);
  const now = new Date().toISOString();
  const note = {
    id: `communication-refund-${Date.now()}`,
    orderId: item.orderId || null,
    orderNumber: item.orderNumber || null,
    customerName: item.customerName || null,
    customerEmail: item.customerEmail || null,
    channel: 'internal-note',
    direction: 'internal',
    status: 'logged',
    subject: `Payment refund/reversal ${item.status || 'updated'}`,
    message: `${action}: ${item.invoiceNumber || item.intentId || item.id} for ${item.currency || 'GBP'} ${Number(item.refundMinor || 0) / 100}`,
    createdAt: now,
    updatedAt: now,
    source: 'payment-refunds',
    history: [{ at: now, action, status: item.status, source: 'payment-refunds' }],
  };
  await saveConfigItems(request, COMMUNICATION_KEY, 'Customer communication log', 'Manual notes and communication visibility records for storefront orders.', [note, ...items].slice(0, 200), 'StorefrontCustomerCommunications');
}

function seedItems(ledger: any, paymentStore: any, creditItems: any[], refundStore: RefundStore) {
  const existing = new Map((refundStore.items || []).map((item: any) => [String(item.intentId || item.invoiceId || item.creditId || item.id), item]));
  const captured = (paymentStore.intents || []).filter((intent: any) => String(intent.status || '') === 'captured');
  const fromCaptured = captured.map((intent: any) => {
    const invoice = (ledger.invoices || []).find((entry: any) => String(entry.id || '') === String(intent.invoiceId || ''));
    const credit = (creditItems || []).find((entry: any) => String(entry.orderId || '') === String(intent.orderId || '') || String(entry.invoiceId || '') === String(intent.invoiceId || ''));
    const previous = existing.get(String(intent.id || '')) || {};
    const requestedMinor = Number(credit?.requestedMinor || previous.refundMinor || intent.amountMinor || invoice?.grossTotalMinor || 0);
    return {
      id: previous.id || `refund-${intent.id || Date.now()}`,
      intentId: intent.id,
      invoiceId: intent.invoiceId,
      invoiceNumber: intent.invoiceNumber,
      orderId: intent.orderId,
      orderNumber: invoice?.orderNumber || intent.orderNumber || null,
      customerName: invoice?.customerName || intent.customerName || null,
      customerEmail: invoice?.customerEmail || intent.customerEmail || null,
      creditId: credit?.id || previous.creditId || null,
      paymentStatus: intent.status,
      invoiceStatus: invoice?.status || 'missing-invoice',
      status: previous.status || (credit?.status === 'issued' ? 'refund-ready' : credit ? 'requested' : 'available'),
      refundMinor: requestedMinor,
      capturedMinor: Number(intent.amountMinor || 0),
      refundableMinor: Math.max(0, Number(intent.amountMinor || 0) - Number(previous.refundedMinor || 0)),
      refundedMinor: Number(previous.refundedMinor || 0),
      currency: intent.currency || invoice?.currency || 'GBP',
      reason: previous.reason || credit?.reason || 'Refund/reversal review for captured payment.',
      createdAt: previous.createdAt || credit?.createdAt || intent.createdAt || new Date().toISOString(),
      updatedAt: previous.updatedAt || credit?.updatedAt || intent.updatedAt || new Date().toISOString(),
      history: Array.isArray(previous.history) ? previous.history : [],
    };
  });
  const manualOnly = (refundStore.items || []).filter((item: any) => !fromCaptured.some((seed: any) => String(seed.intentId || '') === String(item.intentId || '')));
  return [...fromCaptured, ...manualOnly].sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
}

function summarise(items: any[], actions: any[]) {
  return {
    itemCount: items.length,
    availableCount: items.filter((item) => String(item.status || '') === 'available').length,
    requestedCount: items.filter((item) => ['requested', 'approved', 'refund-ready'].includes(String(item.status || ''))).length,
    refundedCount: items.filter((item) => ['refunded', 'reversed'].includes(String(item.status || ''))).length,
    openMinor: items.filter((item) => !['refunded', 'reversed', 'closed', 'rejected'].includes(String(item.status || ''))).reduce((sum, item) => sum + Number(item.refundMinor || 0), 0),
    refundedMinor: items.reduce((sum, item) => sum + Number(item.refundedMinor || 0), 0),
    actionCount: actions.length,
    currency: items[0]?.currency || 'GBP',
  };
}

function statusFromAction(action: string, current: string) {
  if (action === 'request-refund') return 'requested';
  if (action === 'approve-refund') return 'approved';
  if (action === 'mark-refunded') return 'refunded';
  if (action === 'reverse-payment') return 'reversed';
  if (action === 'reject-refund') return 'rejected';
  if (action === 'close-refund') return 'closed';
  return current || 'available';
}

export async function GET(request: NextRequest) {
  try {
    const ledger = await readLedger(request);
    const paymentStore = await readPaymentStore(request);
    const creditItems = await readConfigItems<any>(request, CREDIT_KEY);
    const refundStore = await readRefundStore(request);
    const items = seedItems(ledger, paymentStore, creditItems, refundStore);
    const store = { items, actions: refundStore.actions };
    await saveRefundStore(request, store);
    return NextResponse.json({ ok: true, source: 'internal-payment-refunds-db', data: { ...store, summary: summarise(items, store.actions) } });
  } catch (error) { return responseError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim();
    if (!['request-refund', 'approve-refund', 'mark-refunded', 'reverse-payment', 'reject-refund', 'close-refund'].includes(action)) return responseError(new Error('Unsupported refund action.'), 400);
    const refundId = String(body.refundId || body.id || '').trim();
    const intentId = String(body.intentId || '').trim();
    if (!refundId && !intentId) return responseError(new Error('refundId or intentId is required.'), 400);

    const ledger = await readLedger(request);
    const paymentStore = await readPaymentStore(request);
    const creditItems = await readConfigItems<any>(request, CREDIT_KEY);
    const refundStore = await readRefundStore(request);
    const now = new Date().toISOString();
    let items = seedItems(ledger, paymentStore, creditItems, refundStore);
    const matchIndex = items.findIndex((item) => String(item.id || '') === refundId || String(item.intentId || '') === intentId);
    if (matchIndex < 0) return responseError(new Error('Refund/reversal item not found.'), 404);
    const current = items[matchIndex];
    const refundMinor = Math.min(Number(body.refundMinor || current.refundMinor || 0), Number(current.capturedMinor || current.refundMinor || 0));
    const nextStatus = statusFromAction(action, current.status);
    const updated = {
      ...current,
      status: nextStatus,
      refundMinor,
      refundedMinor: ['mark-refunded', 'reverse-payment'].includes(action) ? refundMinor : Number(current.refundedMinor || 0),
      updatedAt: now,
      history: [{ at: now, action, status: nextStatus, source: 'payment-refunds' }, ...(Array.isArray(current.history) ? current.history : [])],
    };
    items = items.map((item, index) => index === matchIndex ? updated : item);

    if (['mark-refunded', 'reverse-payment'].includes(action)) {
      const ledgerEvent = {
        id: `refund-ledger-${Date.now()}`,
        intentId: updated.intentId,
        invoiceId: updated.invoiceId,
        invoiceNumber: updated.invoiceNumber,
        orderId: updated.orderId,
        paymentReference: action === 'reverse-payment' ? `REV-${Date.now()}` : `REF-${Date.now()}`,
        amountMinor: -Math.abs(refundMinor),
        currency: updated.currency || 'GBP',
        status: action === 'reverse-payment' ? 'reversed' : 'refunded',
        trackedAt: now,
        source: 'payment-refunds',
      };
      ledger.payments = [ledgerEvent, ...ledger.payments];
      ledger.invoices = ledger.invoices.map((invoice: any) => String(invoice.id || '') === String(updated.invoiceId || '') ? {
        ...invoice,
        status: refundMinor >= Number(invoice.grossTotalMinor || 0) ? 'refunded' : 'partially-refunded',
        refundedMinor: Number(invoice.refundedMinor || 0) + refundMinor,
        updatedAt: now,
        history: [{ at: now, action, amountMinor: refundMinor, source: 'payment-refunds' }, ...(Array.isArray(invoice.history) ? invoice.history : [])],
      } : invoice);
      await saveLedger(request, ledger);
    }

    const actionEvent = { id: `refund-action-${Date.now()}`, action, refundId: updated.id, intentId: updated.intentId, invoiceNumber: updated.invoiceNumber, status: nextStatus, refundMinor, currency: updated.currency, createdAt: now };
    const store = { items, actions: [actionEvent, ...refundStore.actions].slice(0, 100) };
    await saveRefundStore(request, store);
    await logCommunication(request, updated, action);
    return NextResponse.json({ ok: true, source: 'internal-payment-refunds-db', data: { ...store, summary: summarise(items, store.actions) }, item: updated });
  } catch (error) { return responseError(error); }
}
