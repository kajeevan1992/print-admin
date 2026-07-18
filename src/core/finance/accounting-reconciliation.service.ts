import crypto from 'node:crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { listFormalInvoices, resolveInvoiceTenant, type FormalInvoice } from '@/core/invoices/formal-invoices.service';

export type FinanceIssueSeverity = 'critical' | 'warning' | 'info';
export type FinanceIssueCode = 'missing-invoice' | 'orphan-invoice' | 'amount-mismatch' | 'currency-mismatch' | 'missing-payment-reference' | 'duplicate-payment-reference' | 'missing-credit-note' | 'refund-mismatch' | 'invoice-status-mismatch';
export type FinanceReconciliationIssue = {
  id: string;
  code: FinanceIssueCode;
  severity: FinanceIssueSeverity;
  orderId: string;
  orderNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  message: string;
  expectedMinor: number;
  actualMinor: number;
  currency: string;
};
export type FinanceVatRow = {
  rate: number;
  salesNetMinor: number;
  salesVatMinor: number;
  salesGrossMinor: number;
  creditNetMinor: number;
  creditVatMinor: number;
  creditGrossMinor: number;
  netNetMinor: number;
  netVatMinor: number;
  netGrossMinor: number;
};
export type FinanceReconciliationReport = {
  id: string;
  tenantId: string;
  tenantSlug: string;
  storeSlug: string;
  from: string;
  to: string;
  generatedAt: string;
  currency: string;
  summary: {
    invoiceCount: number;
    creditNoteCount: number;
    paidOrderCount: number;
    matchedCount: number;
    issueCount: number;
    criticalCount: number;
    warningCount: number;
    invoiceGrossMinor: number;
    creditGrossMinor: number;
    netSalesMinor: number;
    outputVatMinor: number;
    netRevenueMinor: number;
  };
  vat: FinanceVatRow[];
  issues: FinanceReconciliationIssue[];
  invoices: FormalInvoice[];
};

type OrderRow = Record<string, any>;
function clean(value: unknown) { return String(value || '').trim(); }
function minor(value: unknown) { const next = Number(value || 0); return Number.isFinite(next) ? Math.round(next) : 0; }
function iso(value: unknown) { if (!value) return ''; const parsed = new Date(value as any); return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString(); }
function parseJson(value: unknown) { if (!value || typeof value !== 'string') return {} as Record<string, any>; try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' ? parsed : {}; } catch { return {}; } }
function dateBound(value: unknown, fallback: Date, end = false) { const text = clean(value); if (!text) return fallback; const parsed = new Date(text.length <= 10 ? `${text}T${end ? '23:59:59.999' : '00:00:00.000'}Z` : text); return Number.isNaN(parsed.getTime()) ? fallback : parsed; }
function inRange(value: unknown, from: Date, to: Date) { const parsed = new Date(value as any); return !Number.isNaN(parsed.getTime()) && parsed >= from && parsed <= to; }
function paidStatus(value: unknown) { return ['paid', 'captured', 'authorized', 'refunded'].includes(clean(value).toLowerCase()); }
function paymentReference(order: any) { return clean(order.paymentReference || order.stripePaymentIntentId || order.stripeCheckoutSessionId); }
function invoicePaymentReference(invoice: FormalInvoice) { const payment = invoice.paymentSnapshot || {}; return clean((payment as any).reference || (payment as any).paymentIntentId || (payment as any).checkoutSessionId); }
function issue(input: Omit<FinanceReconciliationIssue, 'id'>): FinanceReconciliationIssue { return { id: `fri-${crypto.randomUUID()}`, ...input }; }

async function ensureRunTable() {
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "FinanceReconciliationRun" ("id" TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL,"tenantSlug" TEXT NOT NULL,"storeSlug" TEXT NOT NULL DEFAULT '',"fromDate" TIMESTAMP(3) NOT NULL,"toDate" TIMESTAMP(3) NOT NULL,"status" TEXT NOT NULL DEFAULT 'completed',"issueCount" INTEGER NOT NULL DEFAULT 0,"criticalCount" INTEGER NOT NULL DEFAULT 0,"invoiceGrossMinor" INTEGER NOT NULL DEFAULT 0,"creditGrossMinor" INTEGER NOT NULL DEFAULT 0,"snapshotJson" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "FinanceReconciliationRun_tenant_idx" ON "FinanceReconciliationRun"("tenantId","createdAt")');
}

function normaliseOrder(row: OrderRow) {
  const notes = parseJson(row.notes);
  const payment = notes.payment || notes;
  return {
    id: clean(row.id),
    orderNumber: clean(row.orderNumber),
    status: clean(row.status),
    currency: clean(row.currency) || 'GBP',
    totalMinor: minor(row.totalMinor),
    paymentStatus: clean(payment.paymentStatus),
    paymentReference: clean(payment.paymentReference),
    stripeCheckoutSessionId: clean(payment.stripeCheckoutSessionId),
    stripePaymentIntentId: clean(payment.stripePaymentIntentId),
    stripeRefundId: clean(payment.stripeRefundId),
    refundAmountMinor: minor(payment.refundAmountMinor),
    paidAt: iso(payment.paidAt),
    refundedAt: iso(payment.refundedAt),
    createdAt: iso(row.createdAt),
  };
}

function buildVat(invoices: FormalInvoice[]) {
  const map = new Map<number, FinanceVatRow>();
  const get = (rate: number) => map.get(rate) || { rate, salesNetMinor: 0, salesVatMinor: 0, salesGrossMinor: 0, creditNetMinor: 0, creditVatMinor: 0, creditGrossMinor: 0, netNetMinor: 0, netVatMinor: 0, netGrossMinor: 0 };
  for (const invoice of invoices) {
    for (const line of invoice.lines) {
      const rate = Number.isFinite(Number(line.vatRate)) ? Number(line.vatRate) : 0;
      const row = get(rate);
      row.salesNetMinor += minor(line.netMinor); row.salesVatMinor += minor(line.vatMinor); row.salesGrossMinor += minor(line.grossMinor); map.set(rate, row);
    }
    for (const note of invoice.creditNotes.filter((item) => item.status === 'issued')) for (const line of note.lines) {
      const rate = Number.isFinite(Number(line.vatRate)) ? Number(line.vatRate) : 0;
      const row = get(rate);
      row.creditNetMinor += minor(line.netMinor); row.creditVatMinor += minor(line.vatMinor); row.creditGrossMinor += minor(line.grossMinor); map.set(rate, row);
    }
  }
  return [...map.values()].map((row) => ({ ...row, netNetMinor: row.salesNetMinor - row.creditNetMinor, netVatMinor: row.salesVatMinor - row.creditVatMinor, netGrossMinor: row.salesGrossMinor - row.creditGrossMinor })).sort((a, b) => a.rate - b.rate);
}

export async function buildFinanceReconciliation(tenantSlug: string, options: { from?: string; to?: string; storeSlug?: string } = {}): Promise<FinanceReconciliationReport> {
  const tenant = await resolveInvoiceTenant(tenantSlug);
  const now = new Date();
  const from = dateBound(options.from, new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const to = dateBound(options.to, now, true);
  if (from > to) throw new Error('The reconciliation start date must be before the end date.');
  const allInvoices = await listFormalInvoices(tenant.id, { storeSlug: options.storeSlug, limit: 500 });
  const invoices = allInvoices.filter((invoice) => inRange(invoice.issuedAt, from, to));
  const orderRows = await platformPrisma.$queryRawUnsafe<OrderRow[]>('SELECT id,"orderNumber",status,currency,"totalMinor",notes,"createdAt" FROM "Order" WHERE "tenantId"=$1 ORDER BY "createdAt" DESC LIMIT 5000', tenant.id);
  const orders = orderRows.map(normaliseOrder).filter((order) => inRange(order.paidAt || order.refundedAt || order.createdAt, from, to));
  const paidOrders = orders.filter((order) => paidStatus(order.paymentStatus));
  const invoiceByOrder = new Map(invoices.map((invoice) => [invoice.orderId, invoice]));
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const issues: FinanceReconciliationIssue[] = [];

  for (const order of paidOrders) {
    const invoice = invoiceByOrder.get(order.id);
    if (!invoice) {
      issues.push(issue({ code: 'missing-invoice', severity: 'critical', orderId: order.id, orderNumber: order.orderNumber, invoiceId: '', invoiceNumber: '', message: 'Payment is confirmed but no formal invoice exists.', expectedMinor: order.totalMinor, actualMinor: 0, currency: order.currency }));
      continue;
    }
    if (invoice.totalMinor !== order.totalMinor) issues.push(issue({ code: 'amount-mismatch', severity: 'critical', orderId: order.id, orderNumber: order.orderNumber, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, message: 'Order total and invoice total do not match.', expectedMinor: order.totalMinor, actualMinor: invoice.totalMinor, currency: order.currency }));
    if (invoice.currency !== order.currency) issues.push(issue({ code: 'currency-mismatch', severity: 'critical', orderId: order.id, orderNumber: order.orderNumber, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, message: 'Order and invoice currencies do not match.', expectedMinor: order.totalMinor, actualMinor: invoice.totalMinor, currency: `${order.currency}/${invoice.currency}` }));
    const reference = paymentReference(order) || invoicePaymentReference(invoice);
    if (!reference) issues.push(issue({ code: 'missing-payment-reference', severity: 'warning', orderId: order.id, orderNumber: order.orderNumber, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, message: 'The paid invoice has no Stripe or manual payment reference.', expectedMinor: order.totalMinor, actualMinor: invoice.totalMinor, currency: invoice.currency }));
    if (order.paymentStatus.toLowerCase() === 'refunded') {
      if (!invoice.creditNotes.some((note) => note.status === 'issued')) issues.push(issue({ code: 'missing-credit-note', severity: 'critical', orderId: order.id, orderNumber: order.orderNumber, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, message: 'The order is refunded but no issued credit note exists.', expectedMinor: order.refundAmountMinor || invoice.totalMinor, actualMinor: 0, currency: invoice.currency }));
      else if (order.refundAmountMinor && invoice.creditedMinor !== order.refundAmountMinor) issues.push(issue({ code: 'refund-mismatch', severity: 'critical', orderId: order.id, orderNumber: order.orderNumber, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, message: 'The recorded refund amount and issued credit notes do not match.', expectedMinor: order.refundAmountMinor, actualMinor: invoice.creditedMinor, currency: invoice.currency }));
    }
  }

  for (const invoice of invoices) {
    const order = orderById.get(invoice.orderId);
    if (!order) issues.push(issue({ code: 'orphan-invoice', severity: 'critical', orderId: invoice.orderId, orderNumber: invoice.orderNumber, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, message: 'The invoice does not have a matching order in this period.', expectedMinor: invoice.totalMinor, actualMinor: 0, currency: invoice.currency }));
    const expectedStatus = invoice.creditedMinor >= invoice.totalMinor ? 'credited' : invoice.creditedMinor > 0 ? 'partially_credited' : 'paid';
    if (invoice.status !== expectedStatus) issues.push(issue({ code: 'invoice-status-mismatch', severity: 'warning', orderId: invoice.orderId, orderNumber: invoice.orderNumber, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, message: `Invoice status is ${invoice.status}, but its credit-note balance implies ${expectedStatus}.`, expectedMinor: invoice.totalMinor, actualMinor: invoice.creditedMinor, currency: invoice.currency }));
  }

  const references = new Map<string, Array<{ orderId: string; orderNumber: string; invoice?: FormalInvoice }>>();
  for (const order of paidOrders) {
    const invoice = invoiceByOrder.get(order.id);
    const reference = paymentReference(order) || (invoice ? invoicePaymentReference(invoice) : '');
    if (!reference) continue;
    references.set(reference, [...(references.get(reference) || []), { orderId: order.id, orderNumber: order.orderNumber, invoice }]);
  }
  for (const [reference, matches] of references) if (matches.length > 1) for (const match of matches) issues.push(issue({ code: 'duplicate-payment-reference', severity: 'critical', orderId: match.orderId, orderNumber: match.orderNumber, invoiceId: match.invoice?.id || '', invoiceNumber: match.invoice?.invoiceNumber || '', message: `Payment reference ${reference} is linked to ${matches.length} orders.`, expectedMinor: match.invoice?.totalMinor || 0, actualMinor: match.invoice?.totalMinor || 0, currency: match.invoice?.currency || 'GBP' }));

  const vat = buildVat(invoices);
  const invoiceGrossMinor = invoices.reduce((sum, invoice) => sum + invoice.totalMinor, 0);
  const creditGrossMinor = invoices.reduce((sum, invoice) => sum + invoice.creditedMinor, 0);
  const outputVatMinor = vat.reduce((sum, row) => sum + row.netVatMinor, 0);
  const netRevenueMinor = vat.reduce((sum, row) => sum + row.netNetMinor, 0);
  const issueOrderIds = new Set(issues.map((item) => item.orderId).filter(Boolean));
  return {
    id: `frr-${crypto.randomUUID()}`,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    storeSlug: clean(options.storeSlug),
    from: from.toISOString(),
    to: to.toISOString(),
    generatedAt: new Date().toISOString(),
    currency: invoices[0]?.currency || paidOrders[0]?.currency || 'GBP',
    summary: {
      invoiceCount: invoices.length,
      creditNoteCount: invoices.reduce((sum, invoice) => sum + invoice.creditNotes.filter((note) => note.status === 'issued').length, 0),
      paidOrderCount: paidOrders.length,
      matchedCount: paidOrders.filter((order) => invoiceByOrder.has(order.id) && !issueOrderIds.has(order.id)).length,
      issueCount: issues.length,
      criticalCount: issues.filter((item) => item.severity === 'critical').length,
      warningCount: issues.filter((item) => item.severity === 'warning').length,
      invoiceGrossMinor,
      creditGrossMinor,
      netSalesMinor: invoiceGrossMinor - creditGrossMinor,
      outputVatMinor,
      netRevenueMinor,
    },
    vat,
    issues,
    invoices,
  };
}

export async function saveFinanceReconciliationRun(report: FinanceReconciliationReport) {
  await ensureRunTable();
  await platformPrisma.$executeRawUnsafe('INSERT INTO "FinanceReconciliationRun" (id,"tenantId","tenantSlug","storeSlug","fromDate","toDate",status,"issueCount","criticalCount","invoiceGrossMinor","creditGrossMinor","snapshotJson") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)', report.id, report.tenantId, report.tenantSlug, report.storeSlug, new Date(report.from), new Date(report.to), report.summary.criticalCount ? 'attention' : report.summary.issueCount ? 'review' : 'reconciled', report.summary.issueCount, report.summary.criticalCount, report.summary.invoiceGrossMinor, report.summary.creditGrossMinor, JSON.stringify({ ...report, invoices: report.invoices.map((invoice) => ({ id: invoice.id, invoiceNumber: invoice.invoiceNumber, orderId: invoice.orderId, orderNumber: invoice.orderNumber, totalMinor: invoice.totalMinor, creditedMinor: invoice.creditedMinor, status: invoice.status })) }));
  return report;
}

export async function listFinanceReconciliationRuns(tenantSlug: string, limit = 20) {
  await ensureRunTable();
  const tenant = await resolveInvoiceTenant(tenantSlug);
  const rows = await platformPrisma.$queryRawUnsafe<Array<Record<string, any>>>('SELECT id,"storeSlug","fromDate","toDate",status,"issueCount","criticalCount","invoiceGrossMinor","creditGrossMinor","createdAt" FROM "FinanceReconciliationRun" WHERE "tenantId"=$1 ORDER BY "createdAt" DESC LIMIT $2', tenant.id, Math.max(1, Math.min(100, Number(limit || 20))));
  return rows.map((row) => ({ id: clean(row.id), storeSlug: clean(row.storeSlug), from: iso(row.fromDate), to: iso(row.toDate), status: clean(row.status), issueCount: minor(row.issueCount), criticalCount: minor(row.criticalCount), invoiceGrossMinor: minor(row.invoiceGrossMinor), creditGrossMinor: minor(row.creditGrossMinor), createdAt: iso(row.createdAt) }));
}
