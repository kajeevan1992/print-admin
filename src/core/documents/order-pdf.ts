type OrderPdfType = 'invoice' | 'receipt';

type PdfLine = { text: string; x?: number; y?: number; size?: number };

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
function moneyPounds(value: unknown, currency = 'GBP') {
  const amount = Number(value || 0);
  try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount); } catch { return `GBP ${amount.toFixed(2)}`; }
}
function date(value: unknown) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const d = new Date(String(value));
  if (!Number.isFinite(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
}
function tenantName() {
  return clean(process.env.NEXT_PUBLIC_BRAND_NAME || process.env.BRAND_NAME || process.env.COMPANY_NAME || 'HOLO Print');
}
function tenantAddress() {
  return clean(process.env.COMPANY_ADDRESS || '54 Sidcup High Street, Sidcup, DA14 6EH');
}
function tenantEmail() {
  return clean(process.env.COMPANY_EMAIL || 'sales@holoprint.co.uk');
}
function tenantVat() {
  return clean(process.env.COMPANY_VAT_NUMBER || '');
}
function line(x: number, y: number, size: number, text: unknown) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET`;
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

function orderItems(order: any) {
  return Array.isArray(order?.items) ? order.items : [];
}
function paymentStatus(order: any) {
  return clean(order?.paymentStatus || order?.payment?.paymentStatus || 'unpaid');
}
function documentTitle(type: OrderPdfType, order: any) {
  if (type === 'receipt') return paymentStatus(order) === 'paid' || paymentStatus(order) === 'refunded' ? 'Payment Receipt' : 'Payment Summary';
  return 'Invoice';
}
function documentNumber(type: OrderPdfType, order: any) {
  const prefix = type === 'receipt' ? 'RCT' : 'INV';
  return `${prefix}-${clean(order?.orderNumber || order?.id || Date.now())}`;
}

export function buildOrderDocumentPdf(order: any, type: OrderPdfType = 'invoice') {
  const currency = clean(order?.currency || 'GBP');
  const title = documentTitle(type, order);
  const docNo = documentNumber(type, order);
  const items = orderItems(order);
  const now = new Date().toISOString();
  const commands: string[] = [];
  commands.push(line(50, 790, 22, tenantName()));
  commands.push(line(50, 770, 10, tenantAddress()));
  commands.push(line(50, 755, 10, tenantEmail()));
  if (tenantVat()) commands.push(line(50, 740, 10, `VAT: ${tenantVat()}`));
  commands.push(line(360, 790, 24, title));
  commands.push(line(360, 766, 10, `Document: ${docNo}`));
  commands.push(line(360, 752, 10, `Order: ${clean(order?.orderNumber || order?.id || '')}`));
  commands.push(line(360, 738, 10, `Date: ${date(now)}`));
  commands.push(rule(50, 720, 545));

  commands.push(line(50, 700, 12, 'Bill To'));
  commands.push(line(50, 684, 10, clean(order?.customerName || 'Customer')));
  if (order?.customerCompany) commands.push(line(50, 670, 10, clean(order.customerCompany)));
  if (order?.customerEmail) commands.push(line(50, 656, 10, clean(order.customerEmail)));
  const address = order?.billingAddress || order?.shippingAddress || '';
  let y = 642;
  for (const row of wrap(address, 58).slice(0, 3)) { commands.push(line(50, y, 9, row)); y -= 13; }

  commands.push(line(360, 700, 12, 'Payment'));
  commands.push(line(360, 684, 10, `Status: ${paymentStatus(order)}`));
  if (order?.paymentProvider) commands.push(line(360, 670, 10, `Provider: ${clean(order.paymentProvider)}`));
  if (order?.paidAt) commands.push(line(360, 656, 10, `Paid: ${date(order.paidAt)}`));
  if (order?.stripeRefundId) commands.push(line(360, 642, 9, `Refund: ${clean(order.stripeRefundId)}`));

  commands.push(rule(50, 610, 545));
  commands.push(line(50, 592, 10, 'Description'));
  commands.push(line(315, 592, 10, 'Qty'));
  commands.push(line(365, 592, 10, 'Unit'));
  commands.push(line(455, 592, 10, 'Line total'));
  commands.push(rule(50, 582, 545));
  y = 564;
  const visibleItems = items.slice(0, 14);
  for (const item of visibleItems) {
    const qty = Number(item.quantity || 1);
    const unit = typeof item.unitPriceMinor === 'number' ? moneyMinor(item.unitPriceMinor, currency) : moneyPounds(item.unitPrice || 0, currency);
    const total = typeof item.totalPriceMinor === 'number' ? moneyMinor(item.totalPriceMinor, currency) : moneyPounds(item.totalPrice || 0, currency);
    const name = clean(item.productName || item.titleSnapshot || item.name || 'Print item');
    commands.push(line(50, y, 9, name.slice(0, 48)));
    commands.push(line(318, y, 9, String(qty)));
    commands.push(line(365, y, 9, unit));
    commands.push(line(455, y, 9, total));
    y -= 18;
  }
  if (items.length > visibleItems.length) { commands.push(line(50, y, 9, `+ ${items.length - visibleItems.length} more item(s) on order record`)); y -= 18; }
  commands.push(rule(320, y - 5, 545));
  y -= 24;
  commands.push(line(360, y, 10, 'Subtotal'));
  commands.push(line(455, y, 10, moneyMinor(order?.subtotalMinor || 0, currency))); y -= 16;
  commands.push(line(360, y, 10, 'Delivery'));
  commands.push(line(455, y, 10, moneyMinor(order?.shippingMinor || 0, currency))); y -= 16;
  commands.push(line(360, y, 10, 'VAT'));
  commands.push(line(455, y, 10, moneyMinor(order?.taxMinor || 0, currency))); y -= 18;
  commands.push(line(360, y, 13, 'Total'));
  commands.push(line(455, y, 13, moneyMinor(order?.totalMinor || Math.round(Number(order?.total || 0) * 100), currency)));

  commands.push(rule(50, 92, 545));
  commands.push(line(50, 76, 8, `${title} generated from internal order record. For questions quote ${clean(order?.orderNumber || order?.id || '')}.`));
  commands.push(line(50, 62, 8, 'This document is system generated. Please check VAT and company details in tenant settings before production use.'));

  const stream = commands.join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(stream, 'utf8')} >> stream\n${stream}\nendstream endobj`,
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

export function orderDocumentFilename(order: any, type: OrderPdfType = 'invoice') {
  return `${documentNumber(type, order).replace(/[^a-zA-Z0-9._-]+/g, '-')}.pdf`;
}

export type { OrderPdfType };
