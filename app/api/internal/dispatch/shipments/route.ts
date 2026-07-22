import { NextResponse } from 'next/server';
import { requireTenantSession } from '@/core/auth/session-guard.service';
import { listAdminShipments, readAdminShipment, recordShipmentNotification, runShipmentAction, saveShipmentDetails } from '@/core/dispatch/shipment.service';
import { sendShipmentCustomerEmail } from '@/core/dispatch/shipment-notifications.service';
import { loadStorefrontRuntimeSettings } from '@/theme-runtime/storefront-settings-loader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function clean(value: unknown) { return String(value || '').trim(); }
function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } }); }
function errorResponse(cause: unknown) {
  const message = cause instanceof Error ? cause.message : 'Dispatch operation failed.';
  if (/admin session required/i.test(message)) return json({ ok: false, error: message }, 401);
  if (/tenant access denied/i.test(message)) return json({ ok: false, error: message }, 403);
  if (/not found/i.test(message)) return json({ ok: false, error: message }, 404);
  if (/required|choose|add |only |cannot|must |unsupported|invalid|https|describe|complete /i.test(message)) return json({ ok: false, error: message }, 400);
  return json({ ok: false, error: message }, 500);
}

async function storeName(tenantSlug: string, storeSlug: string) {
  const settings = await loadStorefrontRuntimeSettings(tenantSlug, storeSlug).catch(() => null);
  return settings?.brand?.brandName || settings?.storeName || storeSlug;
}

async function notify(request: Request, tenantSlug: string, storeSlug: string, shipment: Record<string, any>, actor: { id: string; label: string }, note = '') {
  if (!clean(shipment.customerEmail)) return { attempted: false, sent: false, message: 'Shipment has no customer email.' };
  try {
    await sendShipmentCustomerEmail(request, {
      tenantSlug,
      storeSlug,
      storeName: await storeName(tenantSlug, storeSlug),
      customerEmail: shipment.customerEmail,
      customerName: shipment.customerName,
      orderNumber: shipment.orderNumber,
      status: shipment.status,
      carrier: shipment.carrier,
      service: shipment.service,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
      note,
    });
    await recordShipmentNotification(tenantSlug, storeSlug, shipment.id, actor, { sent: true });
    return { attempted: true, sent: true, message: 'Customer notification queued.' };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Customer notification failed.';
    await recordShipmentNotification(tenantSlug, storeSlug, shipment.id, actor, { sent: false, message }).catch(() => null);
    return { attempted: true, sent: false, message };
  }
}

export async function GET(request: Request) {
  try {
    const session = await requireTenantSession();
    const url = new URL(request.url);
    const storeSlug = clean(url.searchParams.get('storeSlug'));
    const data = await listAdminShipments(request, session.tenantId, storeSlug);
    return json({ ok: true, source: 'tenant-shipment-tracking', data });
  } catch (cause) {
    return errorResponse(cause);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireTenantSession();
    const input = await request.json().catch(() => null) as Record<string, any> | null;
    if (!input) return json({ ok: false, error: 'Shipment request body is required.' }, 400);
    const action = clean(input.action).toLowerCase();
    const actor = { id: session.id, label: session.name || session.email };
    if (action === 'save') {
      const shipment = await saveShipmentDetails(session.tenantId, input, actor);
      return json({ ok: true, source: 'tenant-shipment-tracking', shipment });
    }
    if (action === 'notify') {
      const shipment = await readAdminShipment(session.tenantId, clean(input.storeSlug), clean(input.shipmentId));
      const notification = await notify(request, session.tenantId, shipment.storeSlug, shipment, actor, clean(input.note));
      return json({ ok: true, source: 'tenant-shipment-tracking', shipment, notification });
    }
    const shipment = await runShipmentAction(request, session.tenantId, input, actor);
    const shouldNotify = input.sendNotification !== false && ['collection-ready', 'dispatch', 'collected', 'in-transit', 'exception', 'delivered'].includes(action);
    const notification = shouldNotify ? await notify(request, session.tenantId, shipment.storeSlug, shipment, actor, clean(input.note)) : { attempted: false, sent: false, message: '' };
    return json({ ok: true, source: 'tenant-shipment-tracking', shipment, notification });
  } catch (cause) {
    return errorResponse(cause);
  }
}
