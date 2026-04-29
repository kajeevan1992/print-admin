export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const LEDGER_KEY = 'storefront-finance-ledger';
const COMMUNICATION_KEY = 'storefront-customer-communication-log';

type Invoice = Record<string, any> & {
  id: string;
  invoiceNumber: string;
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
  customerEmail?: string;
  currency: string;
  netTotalMinor: number;
  vatTotalMinor: number;
  grossTotalMinor: number;
  status: string;
  issuedAt: string;
  dueAt: string;
  paidAt?: string | null;
  history: any[];
};

type FinanceLedger = { invoices: Invoice[]; payments: any[]; vatSnapshots: any[] };

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Finance ledger failed.' }, { status });
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

async function readLedger(request: NextRequest): Promise<FinanceLedger> {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, LEDGER_KEY);
    const ledger = (record as any)?.metadataJson?.ledger || {};
    return {
      invoices: Array.isArray(ledger.invoices) ? ledger.invoices : [],
      payments: Array.isArray(ledger.payments) ? ledger.payments : [],
      vatSnapshots: Array.isArray(ledger.vatSnapshots) ? ledger.vatSnapshots : [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return { invoices: [], payments: [], vatSnapshots: [] };
    throw error;
  }
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
  const communications = await readConfigItems<any>(request, COMMUNICATION_KEY);
  const now = new Date().toISOString();
  const note = { id: `communication-finance-${Date.now()}`, channel: 'internal-note', direction: 'internal', status: 'logged', subject, message, createdAt: now, updatedAt: now, source: 'finance-ledger', history: [{ at: now, action: 'finance-ledger', source: 'finance-ledger' }] };
  await upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: COMMUNICATION_KEY,
    slug: COMMUNICATION_KEY,
    name: 'Customer communication log',
    description: 'Manual notes and communication visibility records for storefront orders.',
    metadataJson: { items: [note, ...communications], savedAt: now, storageKey: COMMUNICATION_KEY, source: 'StorefrontCustomerCommunications' },
  } as any);
}

function calculate(ledger: FinanceLedger) {
  const activeInvoices = ledger.invoices.filter((invoice) => !['void'].includes(String(invoice.status || '')));
  const paidInvoices = activeInvoices.filter((invoice) => String(invoice.status || '') === 'paid');
  const outstandingInvoices = activeInvoices.filter((invoice) => !['paid'].includes(String(invoice.status || '')));
  const currency = activeInvoices[0]?.currency || 'GBP';
  const sum = (items: any[], key: string) => items.reduce((total, item) => total + Number(item?.[key] || 0), 0);
  const vatSummary = {
    currency,
    netSalesMinor: sum(activeInvoices, 'netTotalMinor'),
    vatDueMinor: sum(activeInvoices, 'vatTotalMinor'),
    grossSalesMinor: sum(activeInvoices, 'grossTotalMinor'),
    paidVatMinor: sum(paidInvoices, 'vatTotalMinor'),
    outstandingVatMinor: sum(outstandingInvoices, 'vatTotalMinor'),
    snapshotCount: ledger.vatSnapshots.length,
    latestSnapshotAt: ledger.vatSnapshots[0]?.createdAt || null,
  };
  const summary = {
    currency,
    invoiceCount: ledger.invoices.length,
    activeInvoiceCount: activeInvoices.length,
    paidInvoiceCount: paidInvoices.length,
    overdueInvoiceCount: activeInvoices.filter((invoice) => String(invoice.status || '') === 'overdue').length,
    voidInvoiceCount: ledger.invoices.filter((invoice) => String(invoice.status || '') === 'void').length,
    invoiceGrossMinor: sum(activeInvoices, 'grossTotalMinor'),
    outstandingMinor: sum(outstandingInvoices, 'grossTotalMinor'),
    paidMinor: sum(paidInvoices, 'grossTotalMinor'),
    paymentEvents: ledger.payments.length,
  };
  return { summary, vatSummary };
}

function amountFromBody(body: any) {
  const gross = Number(body.grossTotalMinor || 0);
  const vat = Number(body.vatTotalMinor || 0);
  const net = Number(body.netTotalMinor || Math.max(0, gross - vat));
  return { grossTotalMinor: gross, vatTotalMinor: vat, netTotalMinor: net };
}

export async function GET(request: NextRequest) {
  try {
    const ledger = await readLedger(request);
    const calculated = calculate(ledger);
    return NextResponse.json({ ok: true, source: 'internal-finance-ledger-db', data: { ...ledger, ...calculated } });
  } catch (error) { return responseError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim();
    if (!['create-invoice', 'mark-paid', 'mark-overdue', 'void-invoice', 'snapshot-vat'].includes(action)) return responseError(new Error('Unsupported finance ledger action.'), 400);

    const ledger = await readLedger(request);
    const now = new Date().toISOString();
    let item: any = null;

    if (action === 'create-invoice') {
      const orderId = String(body.orderId || '').trim();
      if (!orderId) return responseError(new Error('Order is required before creating an invoice.'), 400);
      const existing = ledger.invoices.find((invoice) => String(invoice.orderId || '') === orderId && String(invoice.status || '') !== 'void');
      if (existing) {
        item = existing;
      } else {
        const amounts = amountFromBody(body);
        if (amounts.grossTotalMinor <= 0) return responseError(new Error('Invoice requires a positive gross total.'), 400);
        const dueAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        item = {
          id: `invoice-${Date.now()}`,
          invoiceNumber: `INV-${new Date().getFullYear()}-${String(ledger.invoices.length + 1).padStart(4, '0')}`,
          orderId,
          orderNumber: body.orderNumber || orderId,
          customerName: body.customerName || 'Customer',
          customerEmail: body.customerEmail || '',
          currency: body.currency || 'GBP',
          ...amounts,
          status: 'issued',
          issuedAt: now,
          dueAt,
          paidAt: null,
          history: [{ at: now, action: 'created', source: 'finance-ledger' }],
        } satisfies Invoice;
        ledger.invoices = [item, ...ledger.invoices];
      }
      await logCommunication(request, 'Invoice created', `${item.invoiceNumber} created for ${item.orderNumber || item.orderId}.`);
    }

    if (['mark-paid', 'mark-overdue', 'void-invoice'].includes(action)) {
      const invoiceId = String(body.invoiceId || '').trim();
      if (!invoiceId) return responseError(new Error('Invoice is required before updating finance status.'), 400);
      ledger.invoices = ledger.invoices.map((invoice) => {
        if (String(invoice.id) !== invoiceId) return invoice;
        const nextStatus = action === 'mark-paid' ? 'paid' : action === 'mark-overdue' ? 'overdue' : 'void';
        item = { ...invoice, status: nextStatus, paidAt: action === 'mark-paid' ? now : invoice.paidAt || null, updatedAt: now, history: [{ at: now, action, source: 'finance-ledger' }, ...(Array.isArray(invoice.history) ? invoice.history : [])] };
        return item;
      });
      if (!item) return responseError(new Error('Invoice not found.'), 404);
      if (action === 'mark-paid') {
        const payment = { id: `payment-${Date.now()}`, paymentReference: `PAY-${Date.now()}`, invoiceId: item.id, invoiceNumber: item.invoiceNumber, orderId: item.orderId, amountMinor: item.grossTotalMinor, currency: item.currency, status: 'tracked-paid', trackedAt: now, source: 'manual-finance-tracking' };
        ledger.payments = [payment, ...ledger.payments];
      }
      await logCommunication(request, 'Invoice status updated', `${item.invoiceNumber} changed to ${item.status}.`);
    }

    if (action === 'snapshot-vat') {
      const calculated = calculate(ledger);
      item = { id: `vat-snapshot-${Date.now()}`, createdAt: now, ...calculated.vatSummary, source: 'finance-ledger' };
      ledger.vatSnapshots = [item, ...ledger.vatSnapshots].slice(0, 25);
      await logCommunication(request, 'VAT snapshot created', `VAT snapshot recorded: ${item.vatDueMinor} minor units due across active invoices.`);
    }

    await saveLedger(request, ledger);
    const calculated = calculate(ledger);
    return NextResponse.json({ ok: true, source: 'internal-finance-ledger-db', data: { ...ledger, ...calculated }, item });
  } catch (error) { return responseError(error); }
}
