export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const LEDGER_KEY = 'storefront-finance-ledger';
const PAYMENT_KEY = 'storefront-payment-intents';
const REFUND_KEY = 'storefront-payment-refunds';
const SETTLEMENT_KEY = 'storefront-payment-settlements';
const COMMUNICATION_KEY = 'storefront-customer-communication-log';

type SettlementStore = { items: any[]; actions: any[] };

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Payment settlement operation failed.' }, { status });
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

async function readPaymentStore(request: NextRequest) {
  const record = await readRecord(request, PAYMENT_KEY);
  const store = (record as any)?.metadataJson?.store || {};
  return {
    intents: Array.isArray(store.intents) ? store.intents : [],
    events: Array.isArray(store.events) ? store.events : [],
  };
}

async function readRefundStore(request: NextRequest) {
  const record = await readRecord(request, REFUND_KEY);
  const store = (record as any)?.metadataJson?.store || {};
  return {
    items: Array.isArray(store.items) ? store.items : [],
    actions: Array.isArray(store.actions) ? store.actions : [],
  };
}

async function readSettlementStore(request: NextRequest): Promise<SettlementStore> {
  const record = await readRecord(request, SETTLEMENT_KEY);
  const store = (record as any)?.metadataJson?.store || {};
  return {
    items: Array.isArray(store.items) ? store.items : [],
    actions: Array.isArray(store.actions) ? store.actions : [],
  };
}

async function saveSettlementStore(request: NextRequest, store: SettlementStore) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: SETTLEMENT_KEY,
    slug: SETTLEMENT_KEY,
    name: 'Storefront payment settlements',
    description: 'Internal settlement and payout tracking for captured payments. No live gateway transfer or bank movement.',
    metadataJson: { store, savedAt: new Date().toISOString(), storageKey: SETTLEMENT_KEY, source: 'StorefrontPaymentSettlements' },
  } as any);
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

async function logCommunication(request: NextRequest, item: any, action: string) {
  const items = await readConfigItems<any>(request, COMMUNICATION_KEY);
  const now = new Date().toISOString();
  const note = {
    id: `communication-settlement-${Date.now()}`,
    orderId: item.orderId || null,
    orderNumber: item.orderNumber || null,
    customerName: item.customerName || null,
    customerEmail: item.customerEmail || null,
    channel: 'internal-note',
    direction: 'internal',
    status: 'logged',
    subject: `Payment settlement ${item.status || 'updated'}`,
    message: `${action}: ${item.payoutReference || item.invoiceNumber || item.id} net ${(Number(item.netSettlementMinor || 0) / 100).toFixed(2)} ${item.currency || 'GBP'}`,
    createdAt: now,
    updatedAt: now,
    source: 'payment-settlements',
    history: [{ at: now, action, status: item.status, source: 'payment-settlements' }],
  };
  await saveConfigItems(request, COMMUNICATION_KEY, 'Customer communication log', 'Manual notes and communication visibility records for storefront orders.', [note, ...items].slice(0, 200), 'StorefrontCustomerCommunications');
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function seedItems(ledger: any, paymentStore: any, refundStore: any, settlementStore: SettlementStore) {
  const existing = new Map((settlementStore.items || []).map((item: any) => [String(item.intentId || item.invoiceId || item.id), item]));
  const captured = (paymentStore.intents || []).filter((intent: any) => String(intent.status || '') === 'captured');
  const seeded = captured.map((intent: any) => {
    const invoice = (ledger.invoices || []).find((entry: any) => String(entry.id || '') === String(intent.invoiceId || '')) || {};
    const refunds = (refundStore.items || []).filter((entry: any) => String(entry.intentId || '') === String(intent.id || '') && ['refunded', 'reversed'].includes(String(entry.status || '')));
    const previous = existing.get(String(intent.id || '')) || {};
    const refundedMinor = refunds.reduce((sum: number, entry: any) => sum + Number(entry.refundedMinor || entry.refundMinor || 0), 0);
    const capturedMinor = Number(intent.amountMinor || invoice.grossTotalMinor || 0);
    const netSettlementMinor = Math.max(0, capturedMinor - refundedMinor);
    return {
      id: previous.id || `settlement-${intent.id || Date.now()}`,
      intentId: intent.id,
      invoiceId: intent.invoiceId,
      invoiceNumber: intent.invoiceNumber || invoice.invoiceNumber || null,
      orderId: intent.orderId || invoice.orderId || null,
      orderNumber: intent.orderNumber || invoice.orderNumber || null,
      customerName: intent.customerName || invoice.customerName || null,
      customerEmail: intent.customerEmail || invoice.customerEmail || null,
      payoutReference: previous.payoutReference || `PO-${String(intent.invoiceNumber || intent.id || Date.now()).replace(/[^A-Z0-9]/gi, '').slice(-8).toUpperCase()}`,
      status: previous.status || 'pending-payout',
      capturedMinor,
      refundedMinor,
      netSettlementMinor,
      feeMinor: Number(previous.feeMinor || 0),
      currency: intent.currency || invoice.currency || 'GBP',
      gateway: intent.gateway || 'stripe-ready',
      expectedPayoutDate: previous.expectedPayoutDate || daysFromNow(2),
      settledAt: previous.settledAt || null,
      failureReason: previous.failureReason || null,
      createdAt: previous.createdAt || intent.createdAt || new Date().toISOString(),
      updatedAt: previous.updatedAt || intent.updatedAt || new Date().toISOString(),
      history: Array.isArray(previous.history) ? previous.history : [],
    };
  });
  const manualOnly = (settlementStore.items || []).filter((item: any) => !seeded.some((seed: any) => String(seed.intentId || '') === String(item.intentId || '')));
  return [...seeded, ...manualOnly].sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
}

function summarise(items: any[], actions: any[]) {
  return {
    itemCount: items.length,
    pendingCount: items.filter((item) => ['pending-payout', 'batched'].includes(String(item.status || ''))).length,
    settledCount: items.filter((item) => String(item.status || '') === 'settled').length,
    holdCount: items.filter((item) => String(item.status || '') === 'on-hold').length,
    failedCount: items.filter((item) => String(item.status || '') === 'failed').length,
    pendingNetMinor: items.filter((item) => ['pending-payout', 'batched', 'on-hold'].includes(String(item.status || ''))).reduce((sum, item) => sum + Number(item.netSettlementMinor || 0), 0),
    settledNetMinor: items.filter((item) => String(item.status || '') === 'settled').reduce((sum, item) => sum + Number(item.netSettlementMinor || 0), 0),
    refundedMinor: items.reduce((sum, item) => sum + Number(item.refundedMinor || 0), 0),
    actionCount: actions.length,
    currency: items[0]?.currency || 'GBP',
  };
}

function statusFromAction(action: string, current: string) {
  if (action === 'create-payout-batch') return current === 'settled' ? 'settled' : 'batched';
  if (action === 'mark-settled') return 'settled';
  if (action === 'hold-settlement') return 'on-hold';
  if (action === 'clear-hold') return 'pending-payout';
  if (action === 'fail-settlement') return 'failed';
  return current || 'pending-payout';
}

export async function GET(request: NextRequest) {
  try {
    const ledger = await readLedger(request);
    const paymentStore = await readPaymentStore(request);
    const refundStore = await readRefundStore(request);
    const settlementStore = await readSettlementStore(request);
    const items = seedItems(ledger, paymentStore, refundStore, settlementStore);
    const store = { items, actions: settlementStore.actions };
    await saveSettlementStore(request, store);
    return NextResponse.json({ ok: true, source: 'internal-payment-settlements-db', data: { ...store, summary: summarise(items, store.actions) } });
  } catch (error) { return responseError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim();
    if (!['create-payout-batch', 'mark-settled', 'hold-settlement', 'clear-hold', 'fail-settlement'].includes(action)) return responseError(new Error('Unsupported settlement action.'), 400);
    const settlementId = String(body.settlementId || body.id || '').trim();
    const intentId = String(body.intentId || '').trim();
    const ledger = await readLedger(request);
    const paymentStore = await readPaymentStore(request);
    const refundStore = await readRefundStore(request);
    const settlementStore = await readSettlementStore(request);
    let items = seedItems(ledger, paymentStore, refundStore, settlementStore);
    const now = new Date().toISOString();

    if (action === 'create-payout-batch' && !settlementId && !intentId) {
      items = items.map((item) => ['pending-payout', 'failed'].includes(String(item.status || '')) ? {
        ...item,
        status: 'batched',
        payoutReference: item.payoutReference || `PO-${Date.now()}`,
        updatedAt: now,
        history: [{ at: now, action, status: 'batched', source: 'payment-settlements' }, ...(Array.isArray(item.history) ? item.history : [])].slice(0, 20),
      } : item);
      const actionRecord = { id: `settlement-action-${Date.now()}`, action, status: 'batched', payoutReference: `batch-${Date.now()}`, createdAt: now };
      const store = { items, actions: [actionRecord, ...settlementStore.actions].slice(0, 200) };
      await saveSettlementStore(request, store);
      return NextResponse.json({ ok: true, source: 'internal-payment-settlements-db', item: actionRecord, data: { ...store, summary: summarise(items, store.actions) } });
    }

    const index = items.findIndex((item) => String(item.id || '') === settlementId || String(item.intentId || '') === intentId);
    if (index === -1) return responseError(new Error('Settlement item was not found.'), 404);
    const previous = items[index];
    const status = statusFromAction(action, String(previous.status || 'pending-payout'));
    const updated = {
      ...previous,
      status,
      settledAt: status === 'settled' ? now : previous.settledAt,
      failureReason: status === 'failed' ? 'Manual settlement failure recorded.' : (status === 'on-hold' ? 'Settlement placed on internal hold.' : null),
      updatedAt: now,
      history: [{ at: now, action, status, source: 'payment-settlements' }, ...(Array.isArray(previous.history) ? previous.history : [])].slice(0, 20),
    };
    items[index] = updated;
    const actionRecord = { id: `settlement-action-${Date.now()}`, action, settlementId: updated.id, intentId: updated.intentId, invoiceNumber: updated.invoiceNumber, payoutReference: updated.payoutReference, status, netSettlementMinor: updated.netSettlementMinor, currency: updated.currency, createdAt: now };
    const store = { items, actions: [actionRecord, ...settlementStore.actions].slice(0, 200) };
    await saveSettlementStore(request, store);
    await logCommunication(request, updated, action);
    return NextResponse.json({ ok: true, source: 'internal-payment-settlements-db', item: updated, data: { ...store, summary: summarise(items, store.actions) } });
  } catch (error) { return responseError(error); }
}
