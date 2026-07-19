import { listOrders } from '@/core/orders/orders.service';
import { listFormalInvoices, type FormalInvoice } from '@/core/invoices/formal-invoices.service';

export type ReconciliationStatus = 'matched' | 'warning' | 'exception';
export type ReconciliationIssue = {
  code: string;
  severity: ReconciliationStatus;
  message: string;
};
export type ReconciliationRow = {
  orderId: string;
  orderNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  currency: string;
  orderTotalMinor: number;
  invoiceTotalMinor: number;
  creditedMinor: number;
  netCollectedMinor: number;
  paymentStatus: string;
  paymentProvider: string;
  paymentReference: string;
  issuedAt: string;
  paidAt: string;
  status: ReconciliationStatus;
  issues: ReconciliationIssue[];
};
export type AccountingSummary = {
  invoiceCount: number;
  matchedCount: number;
  warningCount: number;
  exceptionCount: number;
  invoicedMinor: number;
  creditedMinor: number;
  netSalesMinor: number;
  vatMinor: number;
  outstandingInvoiceMinor: number;
  paidOrdersWithoutInvoice: number;
};
export type AccountingReport = {
  currency: string;
  from: string;
  to: string;
  generatedAt: string;
  summary: AccountingSummary;
  rows: ReconciliationRow[];
  missingInvoiceOrders: Array<{ id: string; orderNumber: string; customerName: string; customerEmail: string; totalMinor: number; currency: string; paidAt: string; paymentReference: string }>;
  invoices: FormalInvoice[];
};

type Filters = { from?: string | null; to?: string | null; storeSlug?: string | null; search?: string | null };
function clean(value: unknown) { return String(value || '').trim(); }
function minor(value: unknown) { const next = Number(value || 0); return Number.isFinite(next) ? Math.round(next) : 0; }
function dateValue(value: unknown) { const date = value ? new Date(value as any) : null; return date && !Number.isNaN(date.getTime()) ? date : null; }
function startDate(value?: string | null) { const date = dateValue(value); if (!date) return null; date.setUTCHours(0, 0, 0, 0); return date; }
function endDate(value?: string | null) { const date = dateValue(value); if (!date) return null; date.setUTCHours(23, 59, 59, 999); return date; }
function inRange(value: unknown, from: Date | null, to: Date | null) { const date = dateValue(value); if (!date) return !from && !to; return (!from || date >= from) && (!to || date <= to); }
function paidStatus(value: unknown) { return ['paid', 'captured', 'authorized', 'refunded'].includes(clean(value).toLowerCase()); }
function severity(issues: ReconciliationIssue[]): ReconciliationStatus { return issues.some((issue) => issue.severity === 'exception') ? 'exception' : issues.some((issue) => issue.severity === 'warning') ? 'warning' : 'matched'; }
function csvCell(value: unknown) { const text = String(value ?? ''); return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
function csv(rows: unknown[][]) { return rows.map((row) => row.map(csvCell).join(',')).join('\r\n'); }
function isoDate(value: unknown) { const date = dateValue(value); return date ? date.toISOString() : ''; }

export async function buildAccountingReport(request: Request, tenantSlug: string, filters: Filters = {}): Promise<AccountingReport> {
  const [allInvoices, allOrders] = await Promise.all([
    listFormalInvoices(tenantSlug, { storeSlug: clean(filters.storeSlug), limit: 500 }),
    listOrders(request, { limit: 100 }),
  ]);
  const from = startDate(filters.from);
  const to = endDate(filters.to);
  const term = clean(filters.search).toLowerCase();
  const invoices = allInvoices.filter((invoice) => inRange(invoice.issuedAt, from, to)).filter((invoice) => !term || [invoice.invoiceNumber, invoice.orderNumber, invoice.customerName, invoice.customerEmail].join(' ').toLowerCase().includes(term));
  const orderById = new Map<string, any>();
  const orderByNumber = new Map<string, any>();
  for (const order of allOrders) { orderById.set(clean(order.id), order); orderByNumber.set(clean(order.orderNumber), order); }
  const invoicedOrderIds = new Set<string>();
  const rows: ReconciliationRow[] = invoices.map((invoice) => {
    invoicedOrderIds.add(clean(invoice.orderId));
    const order = orderById.get(clean(invoice.orderId)) || orderByNumber.get(clean(invoice.orderNumber));
    const issues: ReconciliationIssue[] = [];
    if (!order) issues.push({ code: 'ORDER_NOT_FOUND', severity: 'exception', message: 'The invoice is not linked to an available tenant order.' });
    if (order && minor(order.totalMinor) !== minor(invoice.totalMinor)) issues.push({ code: 'AMOUNT_MISMATCH', severity: 'exception', message: `Order total ${minor(order.totalMinor)} does not match invoice total ${minor(invoice.totalMinor)} minor units.` });
    if (order && !paidStatus(order.paymentStatus)) issues.push({ code: 'PAYMENT_NOT_CONFIRMED', severity: 'exception', message: `The linked order payment status is ${clean(order.paymentStatus) || 'unknown'}.` });
    const paymentReference = clean(order?.paymentReference || invoice.paymentSnapshot?.reference || invoice.paymentSnapshot?.paymentIntentId || invoice.paymentSnapshot?.checkoutSessionId);
    if (!paymentReference) issues.push({ code: 'PAYMENT_REFERENCE_MISSING', severity: 'warning', message: 'No payment, checkout-session or payment-intent reference is stored.' });
    if (minor(invoice.creditedMinor) > minor(invoice.totalMinor)) issues.push({ code: 'OVER_CREDITED', severity: 'exception', message: 'Credit notes exceed the original invoice value.' });
    const creditTotal = (invoice.creditNotes || []).filter((note) => note.status === 'issued').reduce((sum, note) => sum + minor(note.totalMinor), 0);
    if (creditTotal !== minor(invoice.creditedMinor)) issues.push({ code: 'CREDIT_TOTAL_MISMATCH', severity: 'exception', message: 'Invoice credited total does not match issued credit-note totals.' });
    if (order && clean(order.currency).toUpperCase() !== clean(invoice.currency).toUpperCase()) issues.push({ code: 'CURRENCY_MISMATCH', severity: 'exception', message: 'Order and invoice currencies do not match.' });
    return {
      orderId: clean(invoice.orderId), orderNumber: clean(invoice.orderNumber), invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName, customerEmail: invoice.customerEmail, currency: invoice.currency,
      orderTotalMinor: minor(order?.totalMinor), invoiceTotalMinor: minor(invoice.totalMinor), creditedMinor: minor(invoice.creditedMinor), netCollectedMinor: Math.max(0, minor(invoice.totalMinor) - minor(invoice.creditedMinor)),
      paymentStatus: clean(order?.paymentStatus), paymentProvider: clean(order?.paymentProvider || invoice.paymentSnapshot?.provider), paymentReference,
      issuedAt: isoDate(invoice.issuedAt), paidAt: isoDate(order?.paidAt || invoice.paidAt), status: severity(issues), issues,
    };
  });
  const missingInvoiceOrders = allOrders.filter((order) => paidStatus(order.paymentStatus) && inRange(order.paidAt || order.updatedAt || order.createdAt, from, to) && !invoicedOrderIds.has(clean(order.id))).filter((order) => !term || [order.orderNumber, order.customerName, order.customerEmail].join(' ').toLowerCase().includes(term)).map((order) => ({ id: clean(order.id), orderNumber: clean(order.orderNumber), customerName: clean(order.customerName), customerEmail: clean(order.customerEmail), totalMinor: minor(order.totalMinor), currency: clean(order.currency) || 'GBP', paidAt: isoDate(order.paidAt), paymentReference: clean(order.paymentReference || order.stripePaymentIntentId || order.stripeCheckoutSessionId) }));
  const currency = invoices[0]?.currency || missingInvoiceOrders[0]?.currency || 'GBP';
  const summary: AccountingSummary = {
    invoiceCount: invoices.length,
    matchedCount: rows.filter((row) => row.status === 'matched').length,
    warningCount: rows.filter((row) => row.status === 'warning').length,
    exceptionCount: rows.filter((row) => row.status === 'exception').length + missingInvoiceOrders.length,
    invoicedMinor: invoices.reduce((sum, invoice) => sum + minor(invoice.totalMinor), 0),
    creditedMinor: invoices.reduce((sum, invoice) => sum + minor(invoice.creditedMinor), 0),
    netSalesMinor: invoices.reduce((sum, invoice) => sum + Math.max(0, minor(invoice.totalMinor) - minor(invoice.creditedMinor)), 0),
    vatMinor: invoices.reduce((sum, invoice) => sum + minor(invoice.vatMinor) - (invoice.creditNotes || []).filter((note) => note.status === 'issued').reduce((creditSum, note) => creditSum + minor(note.vatMinor), 0), 0),
    outstandingInvoiceMinor: rows.filter((row) => !paidStatus(row.paymentStatus)).reduce((sum, row) => sum + row.netCollectedMinor, 0),
    paidOrdersWithoutInvoice: missingInvoiceOrders.length,
  };
  return { currency, from: from?.toISOString() || '', to: to?.toISOString() || '', generatedAt: new Date().toISOString(), summary, rows, missingInvoiceOrders, invoices };
}

export function buildAccountingCsv(report: AccountingReport, kind: 'sales' | 'vat' | 'credit-notes' | 'reconciliation') {
  if (kind === 'sales') return csv([
    ['Invoice Number','Issue Date','Order Number','Customer','Customer Email','Currency','Net','VAT','Gross','Credits','Net Sales','Payment Status','Payment Provider','Payment Reference'],
    ...report.invoices.map((invoice) => [invoice.invoiceNumber, invoice.issuedAt, invoice.orderNumber, invoice.customerName, invoice.customerEmail, invoice.currency, (invoice.subtotalMinor / 100).toFixed(2), (invoice.vatMinor / 100).toFixed(2), (invoice.totalMinor / 100).toFixed(2), (invoice.creditedMinor / 100).toFixed(2), ((invoice.totalMinor - invoice.creditedMinor) / 100).toFixed(2), invoice.status, invoice.paymentSnapshot?.provider || '', invoice.paymentSnapshot?.reference || invoice.paymentSnapshot?.paymentIntentId || '']),
  ]);
  if (kind === 'vat') return csv([
    ['Document Type','Document Number','Date','Customer','VAT Rate','Net','VAT','Gross','Currency','Original Invoice'],
    ...report.invoices.flatMap((invoice) => [
      ...invoice.lines.map((line) => ['Invoice', invoice.invoiceNumber, invoice.issuedAt, invoice.customerName, line.vatRate, (line.netMinor / 100).toFixed(2), (line.vatMinor / 100).toFixed(2), (line.grossMinor / 100).toFixed(2), invoice.currency, '']),
      ...(invoice.creditNotes || []).filter((note) => note.status === 'issued').flatMap((note) => note.lines.map((line) => ['Credit Note', note.creditNoteNumber, note.issuedAt, invoice.customerName, line.vatRate, (-line.netMinor / 100).toFixed(2), (-line.vatMinor / 100).toFixed(2), (-line.grossMinor / 100).toFixed(2), note.currency, invoice.invoiceNumber])),
    ]),
  ]);
  if (kind === 'credit-notes') return csv([
    ['Credit Note Number','Issue Date','Original Invoice','Order Number','Customer','Reason','Currency','Net Credit','VAT Credit','Total Credit','External Reference'],
    ...report.invoices.flatMap((invoice) => (invoice.creditNotes || []).filter((note) => note.status === 'issued').map((note) => [note.creditNoteNumber, note.issuedAt, invoice.invoiceNumber, invoice.orderNumber, invoice.customerName, note.reason, note.currency, (note.netMinor / 100).toFixed(2), (note.vatMinor / 100).toFixed(2), (note.totalMinor / 100).toFixed(2), note.externalReference])),
  ]);
  return csv([
    ['Status','Invoice Number','Order Number','Customer','Currency','Invoice Total','Order Total','Credits','Net Collected','Payment Status','Payment Provider','Payment Reference','Issue Codes','Issue Details'],
    ...report.rows.map((row) => [row.status, row.invoiceNumber, row.orderNumber, row.customerName, row.currency, (row.invoiceTotalMinor / 100).toFixed(2), (row.orderTotalMinor / 100).toFixed(2), (row.creditedMinor / 100).toFixed(2), (row.netCollectedMinor / 100).toFixed(2), row.paymentStatus, row.paymentProvider, row.paymentReference, row.issues.map((issue) => issue.code).join('|'), row.issues.map((issue) => issue.message).join(' | ')]),
    ...report.missingInvoiceOrders.map((order) => ['exception', '', order.orderNumber, order.customerName, order.currency, '', (order.totalMinor / 100).toFixed(2), '', '', 'paid', '', order.paymentReference, 'PAID_ORDER_WITHOUT_INVOICE', 'A paid order has no formal invoice.']),
  ]);
}
