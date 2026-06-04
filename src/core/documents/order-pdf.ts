import { defaultInvoiceSettings, type InvoiceBrandSettings } from './invoice-settings';
import { buildOrderVatSummary } from '@/core/tax/order-vat-summary';

type OrderPdfType = 'invoice' | 'receipt';
type VatBucket = { rate: number; netMinor: number; vatMinor: number; grossMinor: number };

function clean(value: unknown) {
  return String(value ?? '').replace(/[\u2010-\u2015]/g, '-').replace(/[\u2022]/g, '-').replace(/[^\x09\x0A\x0D\x20-\x7E£]/g, '');
}
function pdfEscape(value: unknown) {
  return clean(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
function moneyMinor(value: unknown, currency = 'GBP') {
  const amount = Number(value || 0) / 100;
  try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount); } catch { return `GBP ${amount.toFixed(2)}`; }
}
function date(value: unknown) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const d = new Date(String(value));
  if (!Number.isFinite(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
}
function line(x: number, y: number, size: number, text: unknown) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET`;
}
function boldLine(x: number, y: number, size: number, text: unknown) {
  return `BT /F2 ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET`;
}
function rule(x1: number, y: number, x2: number) {
  return `0.6 w ${x1} ${y} m ${x2} ${y} l S`;
}
function wrap(value: unknown, max = 72) {
  const text = clean(value);
  const out: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    if (`${current} ${word}`.trim().length > max) { if (current) out.push(current); current = word; }
    else current = `${current} ${word}`.trim();
  }
  if (current) out.push(current);
  return out.length ? out : [''];
}
function orderItems(order: any) { return Array.isArray(order?.items) ? order.items : []; }
function paymentStatus(order: any) { return clean(order?.paymentStatus || order?.payment?.paymentStatus || 'unpaid'); }
function documentTitle(type: OrderPdfType, order: any) { if (type === 'receipt') return paymentStatus(order) === 'paid' || paymentStatus(order) === 'refunded' ? 'Payment Receipt' : 'Payment Summary'; return 'Tax Invoice'; }
function documentNumber(type: OrderPdfType, order: any) { const prefix = type === 'receipt' ? 'RCT' : 'INV'; return `${prefix}-${clean(order?.orderNumber || order?.id || Date.now())}`; }
function safeRate(value: unknown) { const rate = Number(value); return Number.isFinite(rate) && rate >= 0 ? rate : 20; }
function itemGrossMinor(item: any) { if (typeof item.totalPriceMinor === 'number') return item.totalPriceMinor; if (typeof item.grossTotalMinor === 'number') return item.grossTotalMinor; if (typeof item.totalPrice === 'number') return Math.round(item.totalPrice * 100); if (typeof item.total === 'number') return Math.round(item.total * 100); return 0; }
function itemNetMinor(item: any) { if (typeof item.netTotalMinor === 'number') return item.netTotalMinor; if (typeof item.unitNetMinor === 'number') return item.unitNetMinor * Number(item.quantity || 1); const gross = itemGrossMinor(item); const rate = safeRate(item.vatRate ?? item.metadataJson?.vatRate ?? item.metadataJson?.taxRate); return rate ? Math.round(gross / (1 + rate / 100)) : gross; }
function itemVatMinor(item: any) { if (typeof item.vatMinor === 'number') return item.vatMinor; if (typeof item.vatTotalMinor === 'number') return item.vatTotalMinor; return Math.max(0, itemGrossMinor(item) - itemNetMinor(item)); }
function vatBreakdown(order: any) {
  const summary = buildOrderVatSummary(order);
  const rows = summary.vatBreakdown.map((row) => ({ rate: row.rate, netMinor: row.netMinor, vatMinor: row.vatMinor, grossMinor: row.grossMinor }));
  if (rows.length) return rows;
  const gross = Number(order?.totalMinor || Math.round(Number(order?.total || 0) * 100));
  const vat = Number(order?.taxMinor || 0);
  const net = Math.max(0, gross - vat);
  return [{ rate: vat ? 20 : 0, netMinor: net, vatMinor: vat, grossMinor: gross }];
}
function settingsOrDefault(settings?: Partial<InvoiceBrandSettings>) { return { ...defaultInvoiceSettings(), ...(settings || {}) }; }

export function buildOrderDocumentPdf(order: any, type: OrderPdfType = 'invoice', settings?: Partial<InvoiceBrandSettings>) {
  const brand = settingsOrDefault(settings);
  const taxSummary = buildOrderVatSummary(order);
  const currency = clean(order?.currency || taxSummary.currency || 'GBP');
  const title = documentTitle(type, order);
  const docNo = documentNumber(type, order);
  const items = orderItems(order);
  const now = new Date().toISOString();
  const commands: string[] = [];
  commands.push(boldLine(50, 794, 24, brand.brandName || brand.tradingName || brand.legalName));
  commands.push(line(50, 774, 10, brand.legalName && brand.legalName !== brand.brandName ? `T/A ${brand.tradingName || brand.brandName} - ${brand.legalName}` : brand.address));
  if (brand.legalName && brand.legalName !== brand.brandName) commands.push(line(50, 760, 9, brand.address));
  commands.push(line(50, 746, 9, [brand.email, brand.phone, brand.website].filter(Boolean).join(' | ')));
  if (brand.vatNumber || brand.companyNumber) commands.push(line(50, 732, 9, [brand.vatNumber ? `VAT: ${brand.vatNumber}` : '', brand.companyNumber ? `Company No: ${brand.companyNumber}` : ''].filter(Boolean).join(' | ')));
  commands.push(boldLine(360, 792, 24, title));
  commands.push(line(360, 768, 10, `Document: ${docNo}`));
  commands.push(line(360, 754, 10, `Order: ${clean(order?.orderNumber || order?.id || '')}`));
  commands.push(line(360, 740, 10, `Date: ${date(now)}`));
  commands.push(rule(50, 716, 545));

  commands.push(boldLine(50, 696, 12, 'Bill To'));
  commands.push(line(50, 680, 10, clean(order?.customerName || 'Customer')));
  if (order?.customerCompany) commands.push(line(50, 666, 10, clean(order.customerCompany)));
  if (order?.customerEmail) commands.push(line(50, 652, 10, clean(order.customerEmail)));
  const address = order?.billingAddress || order?.shippingAddress || '';
  let y = 638;
  for (const row of wrap(address, 58).slice(0, 3)) { commands.push(line(50, y, 9, row)); y -= 13; }

  commands.push(boldLine(360, 696, 12, 'Payment'));
  commands.push(line(360, 680, 10, `Status: ${paymentStatus(order)}`));
  if (order?.paymentProvider) commands.push(line(360, 666, 10, `Provider: ${clean(order.paymentProvider)}`));
  if (order?.paidAt) commands.push(line(360, 652, 10, `Paid: ${date(order.paidAt)}`));
  if (order?.stripeRefundId) commands.push(line(360, 638, 9, `Refund: ${clean(order.stripeRefundId)}`));

  commands.push(rule(50, 606, 545));
  commands.push(boldLine(50, 588, 9, 'Description'));
  commands.push(boldLine(292, 588, 9, 'Qty'));
  commands.push(boldLine(326, 588, 9, 'VAT'));
  commands.push(boldLine(372, 588, 9, 'Net'));
  commands.push(boldLine(455, 588, 9, 'Gross'));
  commands.push(rule(50, 578, 545));
  y = 560;
  const visibleItems = items.slice(0, 13);
  for (const item of visibleItems) {
    const qty = Number(item.quantity || 1);
    const gross = itemGrossMinor(item);
    const net = itemNetMinor(item);
    const rate = safeRate(item.vatRate ?? item.metadataJson?.vatRate ?? item.metadataJson?.taxRate ?? (itemVatMinor(item) ? 20 : 0));
    const name = clean(item.productName || item.titleSnapshot || item.name || 'Print item');
    commands.push(line(50, y, 8.5, name.slice(0, 43)));
    commands.push(line(294, y, 8.5, String(qty)));
    commands.push(line(326, y, 8.5, `${rate}%`));
    commands.push(line(372, y, 8.5, moneyMinor(net, currency)));
    commands.push(line(455, y, 8.5, moneyMinor(gross, currency)));
    y -= 17;
  }
  if (items.length > visibleItems.length) { commands.push(line(50, y, 9, `+ ${items.length - visibleItems.length} more item(s) on order record`)); y -= 17; }

  const buckets = vatBreakdown(order);
  y -= 8;
  commands.push(rule(50, y, 545));
  y -= 18;
  commands.push(boldLine(50, y, 10, taxSummary.isMixedVat ? 'Mixed VAT Breakdown' : 'VAT Breakdown'));
  commands.push(boldLine(180, y, 9, 'Rate'));
  commands.push(boldLine(245, y, 9, 'Net'));
  commands.push(boldLine(330, y, 9, 'VAT'));
  commands.push(boldLine(415, y, 9, 'Gross'));
  y -= 15;
  for (const bucket of buckets.slice(0, 4)) {
    commands.push(line(50, y, 8.5, bucket.rate === 0 ? 'Zero rated / exempt' : `VAT ${bucket.rate}%`));
    commands.push(line(180, y, 8.5, `${bucket.rate}%`));
    commands.push(line(245, y, 8.5, moneyMinor(bucket.netMinor, currency)));
    commands.push(line(330, y, 8.5, moneyMinor(bucket.vatMinor, currency)));
    commands.push(line(415, y, 8.5, moneyMinor(bucket.grossMinor, currency)));
    y -= 14;
  }

  y -= 8;
  commands.push(rule(320, y, 545));
  y -= 18;
  commands.push(line(360, y, 10, 'Subtotal / Net'));
  commands.push(line(455, y, 10, moneyMinor(taxSummary.netMinor || buckets.reduce((s, b) => s + b.netMinor, 0), currency))); y -= 16;
  commands.push(line(360, y, 10, 'Delivery'));
  commands.push(line(455, y, 10, moneyMinor(taxSummary.deliveryMinor || 0, currency))); y -= 16;
  commands.push(line(360, y, 10, 'VAT'));
  commands.push(line(455, y, 10, moneyMinor(taxSummary.vatMinor || buckets.reduce((s, b) => s + b.vatMinor, 0), currency))); y -= 18;
  commands.push(boldLine(360, y, 13, 'Total'));
  commands.push(boldLine(455, y, 13, moneyMinor(taxSummary.grossMinor || Math.round(Number(order?.total || 0) * 100), currency)));

  commands.push(rule(50, 104, 545));
  if (brand.bankDetails) commands.push(line(50, 88, 8, `Bank: ${brand.bankDetails}`));
  commands.push(line(50, brand.bankDetails ? 74 : 88, 8, brand.paymentTerms || 'Payment due on receipt unless agreed otherwise.'));
  commands.push(line(50, brand.bankDetails ? 61 : 74, 8, brand.footerNote || 'Thank you for your business.'));
  commands.push(line(50, 48, 7, `${title} generated from internal order VAT summary. Quote ${clean(order?.orderNumber || order?.id || '')} for any questions.`));

  const stream = commands.join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(stream, 'utf8')} >> stream\n${stream}\nendstream endobj`,
    '6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) { offsets.push(Buffer.byteLength(body, 'utf8')); body += `${obj}\n`; }
  const xrefOffset = Buffer.byteLength(body, 'utf8');
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(body, 'utf8');
}

export function orderDocumentFilename(order: any, type: OrderPdfType = 'invoice') { return `${documentNumber(type, order).replace(/[^a-zA-Z0-9._-]+/g, '-')}.pdf`; }
export type { OrderPdfType };
