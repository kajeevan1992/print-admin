export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const LEDGER_KEY = 'storefront-finance-ledger';
const PAYMENT_KEY = 'storefront-payment-intents';
const REFUND_KEY = 'storefront-payment-refunds';
const SETTLEMENT_KEY = 'storefront-payment-settlements';
const DISPUTE_KEY = 'storefront-payment-disputes';
const COMMUNICATION_KEY = 'storefront-customer-communication-log';

type DisputeStore = { items: any[]; actions: any[] };

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Payment dispute operation failed.' }, { status });
}

async function readRecord(request: NextRequest, key: string) {
  try { return await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key); }
  catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return null;
    throw error;
  }
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

async function readConfigItems<T>(request: NextRequest, key: string): Promise<T[]> {
  const record = await readRecord(request, key);
  const items = (record as any)?.metadataJson?.items;
  return Array.isArray(items) ? items : [];
}

async function readLedger(request: NextRequest) {
  const record = await readRecord(request, LEDGER_KEY);
  const ledger = (record as any)?.metadataJson?.ledger || {};
  return { invoices: Array.isArray(ledger.invoices) ? ledger.invoices : [], payments: Array.isArray(ledger.payments) ? ledger.payments : [], vatSnapshots: Array.isArray(ledger.vatSnapshots) ? ledger.vatSnapshots : [] };
}

async function readStore(request: NextRequest, key: string) {
  const record = await readRecord(request, key);
  const store = (record as any)?.metadataJson?.store || {};
  return { items: Array.isArray(store.items) ? store.items : [], actions: Array.isArray(store.actions) ? store.actions : [], intents: Array.isArray(store.intents) ? store.intents : [], events: Array.isArray(store.events) ? store.events : [] };
}

async function readDisputeStore(request: NextRequest): Promise<DisputeStore> {
  const store = await readStore(request, DISPUTE_KEY);
  return { items: store.items, actions: store.actions };
}

async function saveDisputeStore(request: NextRequest, store: DisputeStore) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: DISPUTE_KEY,
    slug: DISPUTE_KEY,
    name: 'Storefront payment disputes',
    description: 'Internal dispute and chargeback tracking for captured payments. No live gateway dispute action.',
    metadataJson: { store, savedAt: new Date().toISOString(), storageKey: DISPUTE_KEY, source: 'StorefrontPaymentDisputes' },
  } as any);
}

async function logCommunication(request: NextRequest, item: any, action: string) {
  const items = await readConfigItems<any>(request, COMMUNICATION_KEY);
  const now = new Date().toISOString();
  const note = {
    id: `communication-dispute-${Date.now()}`,
    orderId: item.orderId || null,
    orderNumber: item.orderNumber || null,
    customerName: item.customerName || null,
    customerEmail: item.customerEmail || null,
    channel: 'internal-note',
    direction: 'internal',
    status: 'logged',
    subject: `Payment dispute ${item.status || 'updated'}`,
    message: `${action}: ${item.disputeReference || item.invoiceNumber || item.id} value ${(Number(item.disputeAmountMinor || 0) / 100).toFixed(2)} ${item.currency || 'GBP'}`,
    createdAt: now,
    updatedAt: now,
    source: 'payment-disputes',
    history: [{ at: now, action, status: item.status, source: 'payment-disputes' }],
  };
  await saveConfigItems(request, COMMUNICATION_KEY, 'Customer communication log', 'Manual notes and communication visibility records for storefront orders.', [note, ...items].slice(0, 200), 'StorefrontCustomerCommunications');
}

function daysFromNow(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }

function statusFromAction(action: string, current: string) {
  if (action === 'open-dispute') return current === 'won' || current === 'lost' ? current : 'open';
  if (action === 'request-evidence') return 'evidence-needed';
  if (action === 'submit-evidence') return 'evidence-submitted';
  if (action === 'mark-won') return 'won';
  if (action === 'mark-lost') return 'lost';
  if (action === 'close-dispute') return current === 'lost' ? 'closed-lost' : 'closed';
  return current || 'open';
}

function seedItems(ledger: any, paymentStore: any, refundStore: any, settlementStore: any, disputeStore: DisputeStore) {
  const existing = new Map((disputeStore.items || []).map((item: any) => [String(item.intentId || item.invoiceId || item.id), item]));
  const captured = (paymentStore.intents || []).filter((intent: any) => String(intent.status || '') === 'captured');
  const seeded = captured.map((intent: any) => {
    const invoice = (ledger.invoices || []).find((entry: any) => String(entry.id || '') === String(intent.invoiceId || '')) || {};
    const refunds = (refundStore.items || []).filter((entry: any) => String(entry.intentId || '') === String(intent.id || ''));
    const settlement = (settlementStore.items || []).find((entry: any) => String(entry.intentId || '') === String(intent.id || '')) || {};
    const previous = existing.get(String(intent.id || '')) || {};
    const capturedMinor = Number(intent.amountMinor || invoice.grossTotalMinor || 0);
    const refundedMinor = refunds.filter((entry: any) => ['refunded', 'reversed'].includes(String(entry.status || ''))).reduce((sum: number, entry: any) => sum + Number(entry.refundedMinor || entry.refundMinor || 0), 0);
    const disputeAmountMinor = Number(previous.disputeAmountMinor || Math.max(0, capturedMinor - refundedMinor));
    return {
      id: previous.id || `dispute-${intent.id || Date.now()}`,
      intentId: intent.id,
      invoiceId: intent.invoiceId,
      invoiceNumber: intent.invoiceNumber || invoice.invoiceNumber || null,
      orderId: intent.orderId || invoice.orderId || null,
      orderNumber: intent.orderNumber || invoice.orderNumber || null,
      customerName: intent.customerName || invoice.customerName || null,
      customerEmail: intent.customerEmail || invoice.customerEmail || null,
      disputeReference: previous.disputeReference || `CB-${String(intent.invoiceNumber || intent.id || Date.now()).replace(/[^A-Z0-9]/gi, '').slice(-8).toUpperCase()}`,
      status: previous.status || 'no-dispute',
      reason: previous.reason || 'not-set',
      capturedMinor,
      refundedMinor,
      disputeAmountMinor,
      currency: intent.currency || invoice.currency || 'GBP',
      gateway: intent.gateway || 'stripe-ready',
      settlementStatus: settlement.status || null,
      payoutReference: settlement.payoutReference || null,
      evidenceDueDate: previous.evidenceDueDate || daysFromNow(7),
      evidenceNotes: previous.evidenceNotes || null,
      openedAt: previous.openedAt || null,
      closedAt: previous.closedAt || null,
      createdAt: previous.createdAt || intent.createdAt || new Date().toISOString(),
      updatedAt: previous.updatedAt || intent.updatedAt || new Date().toISOString(),
      history: Array.isArray(previous.history) ? previous.history : [],
    };
  });
  const manualOnly = (disputeStore.items || []).filter((item: any) => !seeded.some((seed: any) => String(seed.intentId || '') === String(item.intentId || '')));
  return [...seeded, ...manualOnly].sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
}

function summarise(items: any[], actions: any[]) {
  const active = items.filter((item) => ['open', 'evidence-needed', 'evidence-submitted'].includes(String(item.status || '')));
  return {
    itemCount: items.length,
    activeCount: active.length,
    evidenceNeededCount: items.filter((item) => String(item.status || '') === 'evidence-needed').length,
    wonCount: items.filter((item) => String(item.status || '') === 'won').length,
    lostCount: items.filter((item) => ['lost', 'closed-lost'].includes(String(item.status || ''))).length,
    activeExposureMinor: active.reduce((sum, item) => sum + Number(item.disputeAmountMinor || 0), 0),
    lostExposureMinor: items.filter((item) => ['lost', 'closed-lost'].includes(String(item.status || ''))).reduce((sum, item) => sum + Number(item.disputeAmountMinor || 0), 0),
    actionCount: actions.length,
    currency: items[0]?.currency || 'GBP',
  };
}

export async function GET(request: NextRequest) {
  try {
    const ledger = await readLedger(request);
    const paymentStore = await readStore(request, PAYMENT_KEY);
    const refundStore = await readStore(request, REFUND_KEY);
    const settlementStore = await readStore(request, SETTLEMENT_KEY);
    const disputeStore = await readDisputeStore(request);
    const items = seedItems(ledger, paymentStore, refundStore, settlementStore, disputeStore);
    const store = { items, actions: disputeStore.actions };
    await saveDisputeStore(request, store);
    return NextResponse.json({ ok: true, source: 'internal-payment-disputes-db', data: { ...store, summary: summarise(items, store.actions) } });
  } catch (error) { return responseError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim();
    if (!['open-dispute', 'request-evidence', 'submit-evidence', 'mark-won', 'mark-lost', 'close-dispute'].includes(action)) return responseError(new Error('Unsupported dispute action.'), 400);
    const disputeId = String(body.disputeId || body.id || '').trim();
    const intentId = String(body.intentId || '').trim();
    const ledger = await readLedger(request);
    const paymentStore = await readStore(request, PAYMENT_KEY);
    const refundStore = await readStore(request, REFUND_KEY);
    const settlementStore = await readStore(request, SETTLEMENT_KEY);
    const disputeStore = await readDisputeStore(request);
    const items = seedItems(ledger, paymentStore, refundStore, settlementStore, disputeStore);
    const index = items.findIndex((item) => String(item.id || '') === disputeId || String(item.intentId || '') === intentId);
    if (index === -1) return responseError(new Error('Dispute item was not found.'), 404);
    const previous = items[index];
    const now = new Date().toISOString();
    const status = statusFromAction(action, String(previous.status || 'no-dispute'));
    const updated = {
      ...previous,
      status,
      openedAt: action === 'open-dispute' && !previous.openedAt ? now : previous.openedAt,
      closedAt: ['won', 'lost', 'closed', 'closed-lost'].includes(status) ? now : previous.closedAt,
      reason: action === 'open-dispute' && previous.reason === 'not-set' ? 'manual-review' : previous.reason,
      evidenceNotes: action === 'submit-evidence' ? 'Evidence package marked submitted internally.' : previous.evidenceNotes,
      updatedAt: now,
      history: [{ at: now, action, status, source: 'payment-disputes' }, ...(Array.isArray(previous.history) ? previous.history : [])].slice(0, 20),
    };
    items[index] = updated;
    const actionRecord = { id: `dispute-action-${Date.now()}`, action, disputeId: updated.id, intentId: updated.intentId, invoiceNumber: updated.invoiceNumber, disputeReference: updated.disputeReference, status, disputeAmountMinor: updated.disputeAmountMinor, currency: updated.currency, createdAt: now };
    const store = { items, actions: [actionRecord, ...disputeStore.actions].slice(0, 200) };
    await saveDisputeStore(request, store);
    await logCommunication(request, updated, action);
    return NextResponse.json({ ok: true, source: 'internal-payment-disputes-db', item: updated, data: { ...store, summary: summarise(items, store.actions) } });
  } catch (error) { return responseError(error); }
}
