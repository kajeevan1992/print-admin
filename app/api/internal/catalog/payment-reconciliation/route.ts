export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const LEDGER_KEY = 'storefront-finance-ledger';
const PAYMENT_KEY = 'storefront-payment-intents';
const RECONCILIATION_KEY = 'storefront-payment-reconciliation';
const COMMUNICATION_KEY = 'storefront-customer-communication-log';

type ReconciliationStore = { items: any[]; actions: any[] };

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Payment reconciliation operation failed.' }, { status });
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

async function readReconciliationStore(request: NextRequest): Promise<ReconciliationStore> {
  const record = await readRecord(request, RECONCILIATION_KEY);
  const store = (record as any)?.metadataJson?.store || {};
  return {
    items: Array.isArray(store.items) ? store.items : [],
    actions: Array.isArray(store.actions) ? store.actions : [],
  };
}

async function saveReconciliationStore(request: NextRequest, store: ReconciliationStore) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: RECONCILIATION_KEY,
    slug: RECONCILIATION_KEY,
    name: 'Storefront payment reconciliation',
    description: 'Internal reconciliation between payment intent events, ledger payments and invoices. No live gateway money movement.',
    metadataJson: { store, savedAt: new Date().toISOString(), storageKey: RECONCILIATION_KEY, source: 'StorefrontPaymentReconciliation' },
  } as any);
}

async function logCommunication(request: NextRequest, subject: string, message: string) {
  const record = await readRecord(request, COMMUNICATION_KEY);
  const items = Array.isArray((record as any)?.metadataJson?.items) ? (record as any).metadataJson.items : [];
  const now = new Date().toISOString();
  const note = { id: `communication-reconcile-${Date.now()}`, channel: 'internal-note', direction: 'internal', status: 'logged', subject, message, createdAt: now, updatedAt: now, source: 'payment-reconciliation', history: [{ at: now, action: 'payment-reconciliation', source: 'payment-reconciliation' }] };
  await upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: COMMUNICATION_KEY,
    slug: COMMUNICATION_KEY,
    name: 'Customer communication log',
    description: 'Manual notes and communication visibility records for storefront orders.',
    metadataJson: { items: [note, ...items], savedAt: now, storageKey: COMMUNICATION_KEY, source: 'StorefrontCustomerCommunications' },
  } as any);
}

function buildItems(ledger: any, paymentStore: any, reconStore: ReconciliationStore) {
  const existing = new Map((reconStore.items || []).map((item: any) => [String(item.intentId || item.invoiceId || item.id), item]));
  const ledgerPaymentsByIntent = new Map((ledger.payments || []).filter((payment: any) => payment.intentId).map((payment: any) => [String(payment.intentId), payment]));
  const items = (paymentStore.intents || []).map((intent: any) => {
    const invoice = (ledger.invoices || []).find((entry: any) => String(entry.id || '') === String(intent.invoiceId || ''));
    const payment = ledgerPaymentsByIntent.get(String(intent.id || ''));
    const expectedMinor = Number(invoice?.grossTotalMinor ?? intent.amountMinor ?? 0);
    const capturedMinor = String(intent.status || '') === 'captured' ? Number(intent.amountMinor || 0) : 0;
    const varianceMinor = capturedMinor - expectedMinor;
    const previous = existing.get(String(intent.id || '')) || {};
    let status = previous.status || 'pending-review';
    let issue = 'awaiting-capture';
    if (String(intent.status || '') === 'captured' && payment && Math.abs(varianceMinor) === 0) { status = previous.status === 'manual-review' ? previous.status : 'matched'; issue = 'matched'; }
    else if (String(intent.status || '') === 'captured' && !payment) { issue = 'captured-not-ledgered'; status = previous.status === 'matched' ? 'pending-review' : status; }
    else if (String(intent.status || '') === 'captured' && Math.abs(varianceMinor) > 0) { issue = varianceMinor > 0 ? 'overpaid' : 'underpaid'; status = previous.status === 'matched' ? 'pending-review' : status; }
    else if (['failed', 'cancelled'].includes(String(intent.status || ''))) { issue = String(intent.status || ''); status = previous.status === 'matched' ? 'closed' : status; }
    return {
      id: previous.id || `recon-${intent.id || Date.now()}`,
      intentId: intent.id,
      invoiceId: intent.invoiceId,
      invoiceNumber: intent.invoiceNumber,
      orderId: intent.orderId,
      customerEmail: intent.customerEmail,
      expectedMinor,
      capturedMinor,
      varianceMinor,
      currency: intent.currency || invoice?.currency || 'GBP',
      paymentStatus: intent.status || 'pending',
      invoiceStatus: invoice?.status || 'missing-invoice',
      ledgerPaymentId: payment?.id || null,
      issue,
      status,
      updatedAt: previous.updatedAt || intent.updatedAt || intent.createdAt,
      history: Array.isArray(previous.history) ? previous.history : [],
    };
  });
  return items;
}

function calculate(items: any[], actions: any[]) {
  const open = items.filter((item) => !['matched', 'closed', 'written-off'].includes(String(item.status || '')));
  const sum = (rows: any[]) => rows.reduce((total, row) => total + Number(row.varianceMinor || 0), 0);
  return {
    itemCount: items.length,
    openCount: open.length,
    matchedCount: items.filter((item) => String(item.status || '') === 'matched').length,
    reviewCount: items.filter((item) => String(item.status || '') === 'manual-review').length,
    missingLedgerCount: items.filter((item) => String(item.issue || '') === 'captured-not-ledgered').length,
    varianceMinor: sum(items),
    actionCount: actions.length,
    latestActionAt: actions[0]?.createdAt || null,
    currency: items[0]?.currency || 'GBP',
  };
}

export async function GET(request: NextRequest) {
  try {
    const ledger = await readLedger(request);
    const paymentStore = await readPaymentStore(request);
    const reconStore = await readReconciliationStore(request);
    const items = buildItems(ledger, paymentStore, reconStore);
    const store = { items, actions: reconStore.actions };
    await saveReconciliationStore(request, store);
    return NextResponse.json({ ok: true, source: 'internal-payment-reconciliation-db', data: { ...store, summary: calculate(items, store.actions) } });
  } catch (error) { return responseError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim();
    if (!['reconcile-captured', 'flag-review', 'write-off-variance', 'close-reconciliation'].includes(action)) return responseError(new Error('Unsupported reconciliation action.'), 400);
    const intentId = String(body.intentId || '').trim();
    if (!intentId) return responseError(new Error('Payment intent is required before reconciliation.'), 400);

    const ledger = await readLedger(request);
    const paymentStore = await readPaymentStore(request);
    const reconStore = await readReconciliationStore(request);
    const now = new Date().toISOString();
    let items = buildItems(ledger, paymentStore, reconStore);
    const item = items.find((entry) => String(entry.intentId || '') === intentId);
    if (!item) return responseError(new Error('Reconciliation item not found.'), 404);

    if (action === 'reconcile-captured') {
      const intent = paymentStore.intents.find((entry: any) => String(entry.id || '') === intentId);
      if (!intent || String(intent.status || '') !== 'captured') return responseError(new Error('Only captured payment intents can be reconciled.'), 400);
      const alreadyLogged = ledger.payments.some((payment: any) => String(payment.intentId || '') === intentId);
      if (!alreadyLogged) {
        ledger.payments = [{ id: `payment-${Date.now()}`, intentId, paymentReference: `RECON-${Date.now()}`, invoiceId: intent.invoiceId, invoiceNumber: intent.invoiceNumber, orderId: intent.orderId, amountMinor: Number(intent.amountMinor || 0), currency: intent.currency || 'GBP', status: 'captured-reconciled', trackedAt: now, source: 'payment-reconciliation' }, ...ledger.payments];
      }
      ledger.invoices = ledger.invoices.map((invoice: any) => String(invoice.id) === String(intent.invoiceId) ? { ...invoice, status: 'paid', paidAt: invoice.paidAt || now, updatedAt: now, history: [{ at: now, action: 'reconciled-paid', source: 'payment-reconciliation' }, ...(Array.isArray(invoice.history) ? invoice.history : [])] } : invoice);
      await saveLedger(request, ledger);
    }

    const nextStatus = action === 'reconcile-captured' ? 'matched' : action === 'flag-review' ? 'manual-review' : action === 'write-off-variance' ? 'written-off' : 'closed';
    items = buildItems(ledger, paymentStore, reconStore).map((entry) => String(entry.intentId || '') === intentId ? { ...entry, status: nextStatus, updatedAt: now, history: [{ at: now, action, source: 'payment-reconciliation' }, ...(Array.isArray(entry.history) ? entry.history : [])] } : entry);
    const updated = items.find((entry) => String(entry.intentId || '') === intentId);
    const actionEvent = { id: `reconciliation-action-${Date.now()}`, action, intentId, invoiceNumber: item.invoiceNumber, status: nextStatus, varianceMinor: item.varianceMinor, currency: item.currency, createdAt: now };
    const store = { items, actions: [actionEvent, ...reconStore.actions].slice(0, 100) };
    await saveReconciliationStore(request, store);
    await logCommunication(request, 'Payment reconciliation updated', `${item.invoiceNumber || intentId} reconciliation changed to ${nextStatus}.`);
    return NextResponse.json({ ok: true, source: 'internal-payment-reconciliation-db', data: { ...store, summary: calculate(items, store.actions) }, item: updated });
  } catch (error) { return responseError(error); }
}
