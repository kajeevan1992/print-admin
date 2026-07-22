import { NextResponse } from 'next/server';
import { requireTenantSession } from '@/core/auth/session-guard.service';
import { readShipmentPackage } from '@/core/dispatch/shipment-packages.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: { id: string; packageId: string } };

const CODE39: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '$': 'nwnwnwnnn',
  '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn', '*': 'nwnnwnwnn',
};

function clean(value: unknown) { return String(value || '').trim(); }
function escapeHtml(value: unknown) { return clean(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function line(value: unknown) { return clean(value) ? `<div>${escapeHtml(value)}</div>` : ''; }
function barcodeSvg(value: string) {
  const encoded = `*${clean(value).toUpperCase().replace(/[^A-Z0-9\-. $/+%]/g, '-')}*`;
  const narrow = 2;
  const wide = 5;
  let x = 8;
  const bars: string[] = [];
  for (const character of encoded) {
    const pattern = CODE39[character] || CODE39['-'];
    for (let index = 0; index < pattern.length; index += 1) {
      const width = pattern[index] === 'w' ? wide : narrow;
      if (index % 2 === 0) bars.push(`<rect x="${x}" y="4" width="${width}" height="52" fill="#111"/>`);
      x += width;
    }
    x += narrow;
  }
  return `<svg aria-label="Barcode ${escapeHtml(value)}" role="img" viewBox="0 0 ${x + 8} 62" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${bars.join('')}</svg>`;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await requireTenantSession();
    const url = new URL(request.url);
    const storeSlug = clean(url.searchParams.get('storeSlug'));
    if (!storeSlug) return NextResponse.json({ ok: false, error: 'storeSlug is required.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
    const data = await readShipmentPackage(session.tenantId, storeSlug, context.params.id, context.params.packageId);
    const shipment = data.shipment as Record<string, any>;
    const item = data.item as Record<string, any>;
    const format = clean(url.searchParams.get('format')).toLowerCase() === 'a6' ? '105mm 148mm' : '4in 6in';
    const destination = shipment.destination || {};
    const destinationHtml = [destination.recipientName || shipment.customerName, destination.company, destination.line1 || destination.address1, destination.line2 || destination.address2, destination.town || destination.city, destination.county, destination.postcode, destination.country].map(line).join('');
    const contentsHtml = Array.isArray(item.contents) && item.contents.length
      ? item.contents.map((content: string) => `<li>${escapeHtml(content)}</li>`).join('')
      : '<li>Contents not recorded</li>';
    const dimensions = [item.lengthMm, item.widthMm, item.heightMm].every((value) => Number(value) > 0)
      ? `${escapeHtml(item.lengthMm)} × ${escapeHtml(item.widthMm)} × ${escapeHtml(item.heightMm)} mm`
      : 'Not recorded';
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(item.label)} · ${escapeHtml(shipment.orderNumber)}</title><style>@page{size:${format};margin:0}*{box-sizing:border-box}body{margin:0;background:#e5e7eb;font-family:Arial,sans-serif;color:#111}.toolbar{display:flex;gap:8px;justify-content:center;padding:12px}.toolbar button{border:0;border-radius:8px;padding:10px 16px;font-weight:700;cursor:pointer}.label{width:${format.split(' ')[0]};height:${format.split(' ')[1]};margin:0 auto;background:#fff;padding:8mm;display:flex;flex-direction:column;gap:3.5mm;overflow:hidden}.top{display:flex;align-items:flex-start;justify-content:space-between;gap:6mm;border-bottom:3px solid #111;padding-bottom:3mm}.eyebrow{font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:#555}.order{font-size:19px;font-weight:900;margin-top:1.5mm}.box-number{font-size:25px;font-weight:900;text-align:right}.small{font-size:9px;line-height:1.35}.address{font-size:13px;line-height:1.3;font-weight:700}.section{border:1.5px solid #111;border-radius:3mm;padding:3mm}.section h2{font-size:8px;letter-spacing:.14em;text-transform:uppercase;margin:0 0 2mm}.contents{margin:0;padding-left:5mm;font-size:11px;line-height:1.35;font-weight:700}.meta{display:grid;grid-template-columns:1fr 1fr;gap:3mm}.value{font-size:11px;font-weight:800}.barcode{height:22mm;border:2px solid #111;padding:2mm}.barcode svg{display:block;width:100%;height:13mm}.code{text-align:center;font-family:ui-monospace,monospace;font-size:11px;font-weight:900;letter-spacing:.12em}.footer{margin-top:auto;border-top:1px solid #777;padding-top:2mm;font-size:8px;color:#444}.warning{font-weight:800}@media print{body{background:#fff}.toolbar{display:none}.label{margin:0}}</style></head><body><div class="toolbar"><button onclick="window.print()">Print box label</button></div><main class="label"><section class="top"><div><div class="eyebrow">Internal packing label</div><div class="order">${escapeHtml(shipment.orderNumber)}</div><div class="small">${escapeHtml(shipment.productName)} · Order qty ${escapeHtml(shipment.quantity)}</div></div><div><div class="box-number">${escapeHtml(item.label)}</div><div class="small" style="text-align:right">${escapeHtml(shipment.carrier)} · ${escapeHtml(shipment.service)}</div></div></section><section class="section"><h2>Deliver to</h2><div class="address">${destinationHtml || escapeHtml(shipment.customerName || 'Address not set')}</div></section><section class="section"><h2>Box contents</h2><ul class="contents">${contentsHtml}</ul></section><section class="meta"><div class="section"><h2>Packed weight</h2><div class="value">${item.weightGrams ? `${escapeHtml(item.weightGrams)} g` : 'Not recorded'}</div></div><div class="section"><h2>Dimensions</h2><div class="value">${dimensions}</div></div></section><section class="barcode">${barcodeSvg(item.barcode)}<div class="code">${escapeHtml(item.barcode)}</div></section>${item.trackingNumber ? `<div class="small">Box tracking: <strong>${escapeHtml(item.trackingNumber)}</strong></div>` : ''}<section class="footer"><div class="warning">Internal identification label only — not carrier postage.</div><div>Box ${escapeHtml(item.packageNumber)} of ${escapeHtml(data.items.length)} · Shipment ${escapeHtml(shipment.id)}</div>${item.notes ? `<div>Notes: ${escapeHtml(item.notes)}</div>` : ''}</section></main></body></html>`;
    return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `inline; filename="box-${item.packageNumber}-${shipment.orderNumber.replace(/[^a-zA-Z0-9._-]+/g, '-')}.html"`, 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'" } });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Box label failed.';
    const status = /admin session required/i.test(message) ? 401 : /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
