import { NextResponse } from 'next/server';
import { requireTenantSession } from '@/core/auth/session-guard.service';
import { readAdminShipment } from '@/core/dispatch/shipment.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };
function clean(value: unknown) { return String(value || '').trim(); }
function escapeHtml(value: unknown) { return clean(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function line(value: unknown) { return clean(value) ? `<div>${escapeHtml(value)}</div>` : ''; }

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await requireTenantSession();
    const url = new URL(request.url);
    const storeSlug = clean(url.searchParams.get('storeSlug'));
    if (!storeSlug) return NextResponse.json({ ok: false, error: 'storeSlug is required.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
    const shipment = await readAdminShipment(session.tenantId, storeSlug, context.params.id);
    const format = clean(url.searchParams.get('format')).toLowerCase() === 'a6' ? '105mm 148mm' : '4in 6in';
    const destination = shipment.destination || {};
    const sender = shipment.sender || {};
    const destinationHtml = [destination.recipientName || shipment.customerName, destination.company, destination.line1 || destination.address1, destination.line2 || destination.address2, destination.town || destination.city, destination.county, destination.postcode, destination.country].map(line).join('');
    const senderHtml = [sender.name, sender.company, sender.line1 || sender.address1, sender.line2 || sender.address2, sender.town || sender.city, sender.postcode, sender.country].map(line).join('');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Dispatch label ${escapeHtml(shipment.orderNumber)}</title><style>@page{size:${format};margin:0}*{box-sizing:border-box}body{margin:0;background:#e5e7eb;font-family:Arial,sans-serif;color:#111}.toolbar{display:flex;gap:8px;justify-content:center;padding:12px}.toolbar button{border:0;border-radius:8px;padding:10px 16px;font-weight:700;cursor:pointer}.label{width:${format.split(' ')[0]};height:${format.split(' ')[1]};margin:0 auto;background:#fff;padding:10mm;display:flex;flex-direction:column;gap:5mm;overflow:hidden}.top{display:flex;justify-content:space-between;gap:8mm;border-bottom:2px solid #111;padding-bottom:4mm}.eyebrow{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#555}.order{font-size:22px;font-weight:900;margin-top:2mm}.service{font-size:14px;font-weight:800;text-align:right}.box{border:2px solid #111;border-radius:4mm;padding:4mm}.box h2{font-size:10px;letter-spacing:.14em;text-transform:uppercase;margin:0 0 3mm}.address{font-size:16px;line-height:1.35;font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.value{font-size:14px;font-weight:800;overflow-wrap:anywhere}.tracking{border:3px solid #111;padding:4mm;text-align:center}.tracking .number{font-family:ui-monospace,monospace;font-size:18px;font-weight:900;letter-spacing:.08em;overflow-wrap:anywhere}.footer{margin-top:auto;border-top:1px solid #777;padding-top:3mm;font-size:9px;color:#444}.small{font-size:10px;line-height:1.4}.sender{font-size:10px;line-height:1.35}.warning{font-weight:800}@media print{body{background:#fff}.toolbar{display:none}.label{margin:0}}</style></head><body><div class="toolbar"><button onclick="window.print()">Print label</button></div><main class="label"><section class="top"><div><div class="eyebrow">Internal dispatch label</div><div class="order">${escapeHtml(shipment.orderNumber)}</div><div class="small">${escapeHtml(shipment.productName)} · Qty ${escapeHtml(shipment.quantity)}</div></div><div><div class="service">${escapeHtml(shipment.carrier)}</div><div class="service">${escapeHtml(shipment.service)}</div><div class="small" style="text-align:right">Packages: ${escapeHtml(shipment.packageCount)}</div></div></section><section class="box"><h2>Deliver to</h2><div class="address">${destinationHtml || escapeHtml(shipment.customerName || 'Address not set')}</div>${shipment.customerPhone ? `<div class="small" style="margin-top:3mm">Phone: ${escapeHtml(shipment.customerPhone)}</div>` : ''}</section><section class="grid"><div class="box"><h2>Manifest</h2><div class="value">${escapeHtml(shipment.manifestNumber || 'Not set')}</div></div><div class="box"><h2>Weight</h2><div class="value">${shipment.weightGrams ? `${escapeHtml(shipment.weightGrams)} g` : 'Not set'}</div></div></section><section class="tracking"><div class="eyebrow">Tracking number</div><div class="number">${escapeHtml(shipment.trackingNumber || 'NOT SET')}</div></section>${senderHtml ? `<section class="box"><h2>Sender / return</h2><div class="sender">${senderHtml}</div></section>` : ''}<section class="footer"><div class="warning">Internal identification label only — not carrier postage.</div><div>Shipment ${escapeHtml(shipment.id)} · Printed ${escapeHtml(new Date().toLocaleString('en-GB'))}</div>${shipment.notes ? `<div>Notes: ${escapeHtml(shipment.notes)}</div>` : ''}</section></main></body></html>`;
    return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `inline; filename="dispatch-label-${shipment.orderNumber.replace(/[^a-zA-Z0-9._-]+/g, '-')}.html"`, 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'" } });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Dispatch label failed.';
    const status = /admin session required/i.test(message) ? 401 : /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
