export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const LEDGER_KEY = 'storefront-finance-ledger';
const PAYMENT_KEY = 'storefront-payment-intents';
const COMMUNICATION_KEY = 'storefront-customer-communication-log';

type PaymentIntent = Record<string, any> & {
  id: string;
  provider: 'stripe-ready' | 'manual';
  invoiceId: string;
  invoiceNumber: string;
  orderId?: string;
  customerEmail?: string;
  amountMinor: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  history: any[];
};

type PaymentStore = { intents: PaymentIntent[]; events: any[] };

type FinanceLedger = { invoices: any[]; payments: any[]; vatSnapshots: any[] };

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Payment intent operation failed.' }, { status });
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

async function readPaymentStore(request: NextRequest): Promise<PaymentStore> {
  const record = await readRecord(request, PAYMENT_KEY);
  const store = (record as any)?.metadataJson?.store || {};
  return {
    intents: Array.isArray(store.intents) ? store.intents : [],
    events: Array.isArray(store.events) ? store.events : [],
  };
}

async function savePaymentStore(request: NextRequest, store: PaymentStore) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: PAYMENT_KEY,
    slug: PAYMENT_KEY,
    name: 'Storefront payment intents',
    description: 'Stripe-ready payment intent/status tracking for internal checkout. No live gateway call or money movement in this build.',
    metadataJson: { store, savedAt: new Date().toISOString(), storageKey: PAYMENT_KEY, source: 'StorefrontPaymentIntents' },
  } as any);
}

async function readLedger(request: NextRequest): Promise<FinanceLedger> {
  const record = await readRecord(request, LEDGER_KEY);
  const ledger = (record as any)?.metadataJson?.ledger || {};
  return {
    invoices: Array.isArray(ledger.invoices) ? ledger.invoices : [],
    payments: Array.isArray(ledger.payments) ? ledger.payments : [],
    vatSnapshots: Array.isArray(ledger.vatSnapshots) ? ledger.vatSnapshots : [],
  };
}

async function saveLedger(request: NextRequest, ledger: FinanceLedger) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: LEDGER_KEY,
    slug: LEDGER_KEY,
    name: 'Storefront finance ledger',
    description: 'Invoice, payment tracking and VAT reporting foundation for internal storefront orders. No gateway money movement.',
    metadataJson: { ledger, savedAt: new Date().toISOString(), storageKey: LEDGER_KEY, source: 'StorefrontFinanceLedger' },
  } as any);
}

async function logCommunication(request: NextRequest, subject: string, message: string) {
  const record = await readRecord(request, COMMUNICATION_KEY);
  const items = Array.isArray((record as any)?.metadataJson?.items) ? (record as any).metadataJson.items : [];
  const now = new Date().toISOString();
  const note = { id: `communication-payment-${Date.now()}`, channel: 'internal-note', direction: 'internal', status: 'logged', subject, message, createdAt: now, updatedAt: now, source: 'payment-intents', history: [{ at: now, action: 'payment-intent', source: 'payment-intents' }] };
  await upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: COMMUNICATION_KEY,
    slug: COMMUNICATION_KEY,
    name: 'Customer communication log',
    description: 'Manual notes and communication visibility records for storefront orders.',
    metadataJson: { items: [note, ...items], savedAt: now, storageKey: COMMUNICATION_KEY, source: 'StorefrontCustomerCommunications' },
  } as any);
}

function calculate(store: PaymentStore) {
  const active = store.intents.filter((intent) => !['cancelled'].includes(String(intent.status || '')));
  const currency = active[0]?.currency || 'GBP';
  const sum = (items: any[]) => items.reduce((total, item) => total + Number(item?.amountMinor || 0), 0);
  return {
    currency,
    intentCount: store.intents.length,
    eventCount: store.events.length,
    awaitingPaymentCount: active.filter((intent) => ['requires_payment_method', 'payment_link_created', 'pending'].includes(String(intent.status || ''))).length,
    authorizedCount: active.filter((intent) => String(intent.status || '') === 'authorized').length,
    capturedCount: active.filter((intent) => String(intent.status || '') === 'captured').length,
    failedCount: active.filter((intent) => String(intent.status || '') === 'failed').length,
    awaitingPaymentMinor: sum(active.filter((intent) => ['requires_payment_method', 'payment_link_created', 'pending'].includes(String(intent.status || '')))),
    capturedMinor: sum(active.filter((intent) => String(intent.status || '') === 'captured')),
    latestEventAt: store.events[0]?.createdAt || null,
  };
}

function eventFor(intent: PaymentIntent, action: string, now: string) {
  return { id: `payment-event-${Date.now()}`, intentId: intent.id, invoiceId: intent.invoiceId, invoiceNumber: intent.invoiceNumber, orderId: intent.orderId, action, status: intent.status, amountMinor: intent.amountMinor, currency: intent.currency, createdAt: now, provider: intent.provider };
}

export async function GET(request: NextRequest) {
  try {
    const store = await readPaymentStore(request);
    return NextResponse.json({ ok: true, source: 'internal-payment-intents-db', data: { ...store, summary: calculate(store) } });
  } catch (error) { return responseError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim();
    if (!['create-payment-link', 'mark-authorized', 'mark-captured', 'mark-failed', 'cancel-intent'].includes(action)) return responseError(new Error('Unsupported payment intent action.'), 400);

    const store = await readPaymentStore(request);
    const ledger = await readLedger(request);
    const now = new Date().toISOString();
    let item: PaymentIntent | null = null;

    if (action === 'create-payment-link') {
      const invoiceId = String(body.invoiceId || '').trim();
      if (!invoiceId) return responseError(new Error('Invoice is required before creating a payment request.'), 400);
      const invoice = ledger.invoices.find((entry) => String(entry.id || '') === invoiceId);
      if (!invoice) return responseError(new Error('Invoice not found for payment request.'), 404);
      if (String(invoice.status || '') === 'void') return responseError(new Error('Void invoices cannot be sent for payment.'), 400);
      const existing = store.intents.find((intent) => String(intent.invoiceId) === invoiceId && !['captured', 'cancelled'].includes(String(intent.status || '')));
      item = existing || {
        id: `pay-intent-${Date.now()}`,
        provider: 'stripe-ready',
        providerMode: 'not-connected',
        providerIntentId: `stripe_ready_${Date.now()}`,
        paymentUrl: `/checkout/pay/${invoice.invoiceNumber || invoice.id}`,
        invoiceId: String(invoice.id),
        invoiceNumber: String(invoice.invoiceNumber || invoice.id),
        orderId: invoice.orderId || '',
        orderNumber: invoice.orderNumber || invoice.orderId || '',
        customerName: invoice.customerName || 'Customer',
        customerEmail: invoice.customerEmail || '',
        amountMinor: Number(invoice.grossTotalMinor || 0),
        currency: invoice.currency || 'GBP',
        status: 'payment_link_created',
        createdAt: now,
        updatedAt: now,
        history: [{ at: now, action: 'create-payment-link', source: 'payment-intents' }],
      };
      if (!existing) store.intents = [item, ...store.intents];
      await logCommunication(request, 'Payment request created', `${item.invoiceNumber} payment request created (${item.providerMode}).`);
    }

    if (['mark-authorized', 'mark-captured', 'mark-failed', 'cancel-intent'].includes(action)) {
      const intentId = String(body.intentId || '').trim();
      if (!intentId) return responseError(new Error('Payment intent is required before updating payment status.'), 400);
      store.intents = store.intents.map((intent) => {
        if (String(intent.id) !== intentId) return intent;
        const status = action === 'mark-authorized' ? 'authorized' : action === 'mark-captured' ? 'captured' : action === 'mark-failed' ? 'failed' : 'cancelled';
        item = { ...intent, status, updatedAt: now, capturedAt: status === 'captured' ? now : intent.capturedAt || null, history: [{ at: now, action, source: 'payment-intents' }, ...(Array.isArray(intent.history) ? intent.history : [])] };
        return item;
      });
      if (!item) return responseError(new Error('Payment intent not found.'), 404);
      await logCommunication(request, 'Payment status updated', `${item.invoiceNumber} payment status changed to ${item.status}.`);
    }

    if (item) store.events = [eventFor(item, action, now), ...store.events].slice(0, 100);

    if (item && action === 'mark-captured') {
      ledger.invoices = ledger.invoices.map((invoice) => String(invoice.id) === String(item?.invoiceId)
        ? { ...invoice, status: 'paid', paidAt: now, updatedAt: now, history: [{ at: now, action: 'paid-from-payment-intent', source: 'payment-intents' }, ...(Array.isArray(invoice.history) ? invoice.history : [])] }
        : invoice);
      const alreadyLogged = ledger.payments.some((payment) => String(payment.intentId || '') === String(item?.id));
      if (!alreadyLogged) {
        ledger.payments = [{ id: `payment-${Date.now()}`, intentId: item.id, paymentReference: `PAY-${Date.now()}`, invoiceId: item.invoiceId, invoiceNumber: item.invoiceNumber, orderId: item.orderId, amountMinor: item.amountMinor, currency: item.currency, status: 'captured-tracked', trackedAt: now, source: 'payment-intents' }, ...ledger.payments];
      }
      await saveLedger(request, ledger);
    }

    await savePaymentStore(request, store);
    return NextResponse.json({ ok: true, source: 'internal-payment-intents-db', data: { ...store, summary: calculate(store) }, item });
  } catch (error) { return responseError(error); }
}
