export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const LEDGER_KEY = 'storefront-finance-ledger';
const REPORT_KEY = 'storefront-finance-reports';
const COMMUNICATION_KEY = 'storefront-customer-communication-log';

type Invoice = Record<string, any>;
type ReportStore = { exports: any[] };

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Finance report failed.' }, { status });
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

async function readInvoices(request: NextRequest): Promise<Invoice[]> {
  const record = await readRecord(request, LEDGER_KEY);
  const invoices = (record as any)?.metadataJson?.ledger?.invoices;
  return Array.isArray(invoices) ? invoices : [];
}

async function readReportStore(request: NextRequest): Promise<ReportStore> {
  const record = await readRecord(request, REPORT_KEY);
  const exports = (record as any)?.metadataJson?.exports;
  return { exports: Array.isArray(exports) ? exports : [] };
}

async function saveReportStore(request: NextRequest, store: ReportStore) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: REPORT_KEY,
    slug: REPORT_KEY,
    name: 'Storefront finance reports',
    description: 'Internal invoice line-item reporting, aged receivables and export snapshots. No payment gateway or money movement.',
    metadataJson: { ...store, savedAt: new Date().toISOString(), storageKey: REPORT_KEY, source: 'StorefrontFinanceReports' },
  } as any);
}

async function logCommunication(request: NextRequest, subject: string, message: string) {
  const record = await readRecord(request, COMMUNICATION_KEY);
  const communications = (record as any)?.metadataJson?.items;
  const items = Array.isArray(communications) ? communications : [];
  const now = new Date().toISOString();
  const note = { id: `communication-finance-report-${Date.now()}`, channel: 'internal-note', direction: 'internal', status: 'logged', subject, message, createdAt: now, updatedAt: now, source: 'finance-reports', history: [{ at: now, action: 'finance-report', source: 'finance-reports' }] };
  await upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: COMMUNICATION_KEY,
    slug: COMMUNICATION_KEY,
    name: 'Customer communication log',
    description: 'Manual notes and communication visibility records for storefront orders.',
    metadataJson: { items: [note, ...items], savedAt: now, storageKey: COMMUNICATION_KEY, source: 'StorefrontCustomerCommunications' },
  } as any);
}

function daysBetween(dateValue: string | null | undefined, nowMs: number) {
  const time = dateValue ? new Date(dateValue).getTime() : nowMs;
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.floor((nowMs - time) / (24 * 60 * 60 * 1000)));
}

function buildRows(invoices: Invoice[]) {
  const nowMs = Date.now();
  return invoices.map((invoice) => {
    const status = String(invoice.status || 'issued');
    const ageDays = status === 'paid' ? 0 : daysBetween(invoice.dueAt || invoice.issuedAt, nowMs);
    const lineItems = Array.isArray(invoice.lineItems) && invoice.lineItems.length > 0
      ? invoice.lineItems
      : [{ label: 'Print order', quantity: 1, netMinor: Number(invoice.netTotalMinor || 0), vatMinor: Number(invoice.vatTotalMinor || 0), grossMinor: Number(invoice.grossTotalMinor || 0) }];
    return {
      id: String(invoice.id || invoice.invoiceNumber),
      invoiceNumber: invoice.invoiceNumber || invoice.id,
      orderId: invoice.orderId || '',
      orderNumber: invoice.orderNumber || invoice.orderId || '',
      customerName: invoice.customerName || 'Customer',
      customerEmail: invoice.customerEmail || '',
      status,
      currency: invoice.currency || 'GBP',
      issuedAt: invoice.issuedAt || null,
      dueAt: invoice.dueAt || null,
      ageDays,
      lineItemCount: lineItems.length,
      lineItems,
      netTotalMinor: Number(invoice.netTotalMinor || 0),
      vatTotalMinor: Number(invoice.vatTotalMinor || 0),
      grossTotalMinor: Number(invoice.grossTotalMinor || 0),
    };
  });
}

function buildCsv(rows: any[]) {
  const header = ['invoiceNumber','orderNumber','customerName','customerEmail','status','issuedAt','dueAt','ageDays','lineItemCount','netTotalMinor','vatTotalMinor','grossTotalMinor','currency'];
  const escape = (value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [header.join(','), ...rows.map((row) => header.map((key) => escape(row[key])).join(','))].join('\n');
}

function calculate(rows: any[], exports: any[]) {
  const active = rows.filter((row) => !['void'].includes(String(row.status || '')));
  const outstanding = active.filter((row) => !['paid'].includes(String(row.status || '')));
  const currency = active[0]?.currency || 'GBP';
  const sum = (items: any[], key: string) => items.reduce((total, item) => total + Number(item?.[key] || 0), 0);
  return {
    currency,
    rowCount: rows.length,
    exportCount: exports.length,
    activeInvoiceCount: active.length,
    outstandingInvoiceCount: outstanding.length,
    netTotalMinor: sum(active, 'netTotalMinor'),
    vatTotalMinor: sum(active, 'vatTotalMinor'),
    grossTotalMinor: sum(active, 'grossTotalMinor'),
    currentMinor: sum(outstanding.filter((row) => Number(row.ageDays || 0) === 0), 'grossTotalMinor'),
    aged1To14Minor: sum(outstanding.filter((row) => Number(row.ageDays || 0) >= 1 && Number(row.ageDays || 0) <= 14), 'grossTotalMinor'),
    aged15To30Minor: sum(outstanding.filter((row) => Number(row.ageDays || 0) >= 15 && Number(row.ageDays || 0) <= 30), 'grossTotalMinor'),
    aged30PlusMinor: sum(outstanding.filter((row) => Number(row.ageDays || 0) > 30), 'grossTotalMinor'),
    latestExportAt: exports[0]?.createdAt || null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const [invoices, reportStore] = await Promise.all([readInvoices(request), readReportStore(request)]);
    const rows = buildRows(invoices);
    const csvPreview = buildCsv(rows).split('\n').slice(0, 8).join('\n');
    return NextResponse.json({ ok: true, source: 'internal-finance-reports-db', data: { rows, exports: reportStore.exports, summary: calculate(rows, reportStore.exports), csvPreview } });
  } catch (error) { return responseError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim();
    if (!['snapshot-export', 'clear-exports'].includes(action)) return responseError(new Error('Unsupported finance report action.'), 400);

    const invoices = await readInvoices(request);
    const rows = buildRows(invoices);
    const reportStore = await readReportStore(request);
    const now = new Date().toISOString();
    let item: any = null;

    if (action === 'snapshot-export') {
      item = { id: `finance-export-${Date.now()}`, exportNumber: `FIN-EXP-${new Date().getFullYear()}-${String(reportStore.exports.length + 1).padStart(4, '0')}`, type: 'invoice-vat-csv', rowCount: rows.length, createdAt: now, summary: calculate(rows, reportStore.exports), csvPreview: buildCsv(rows).split('\n').slice(0, 8).join('\n') };
      reportStore.exports = [item, ...reportStore.exports].slice(0, 25);
      await logCommunication(request, 'Finance export snapshot', `${item.exportNumber} created with ${item.rowCount} invoice rows.`);
    }

    if (action === 'clear-exports') {
      item = { id: `finance-export-clear-${Date.now()}`, type: 'clear-exports', clearedCount: reportStore.exports.length, createdAt: now };
      reportStore.exports = [];
      await logCommunication(request, 'Finance exports cleared', `${item.clearedCount} finance export snapshots cleared.`);
    }

    await saveReportStore(request, reportStore);
    const csvPreview = buildCsv(rows).split('\n').slice(0, 8).join('\n');
    return NextResponse.json({ ok: true, source: 'internal-finance-reports-db', data: { rows, exports: reportStore.exports, summary: calculate(rows, reportStore.exports), csvPreview }, item });
  } catch (error) { return responseError(error); }
}
