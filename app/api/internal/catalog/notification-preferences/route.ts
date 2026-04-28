export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const PREFERENCE_KEY = 'storefront-notification-preferences';
const ORDER_STATUS_KEY = 'storefront-order-status';
const NOTIFICATION_KEY = 'storefront-customer-notifications';

type PreferenceRecord = Record<string, any> & {
  id: string;
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  muted: boolean;
  allowedEvents: string[];
  updatedAt: string;
  history?: any[];
};

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Notification preference request failed.' }, { status });
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

async function saveConfigItems(request: NextRequest, key: string, name: string, description: string, items: unknown[], source: string) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: key,
    slug: key,
    name,
    description,
    metadataJson: { items, savedAt: new Date().toISOString(), storageKey: key, source },
  } as any);
}

function summarise(items: PreferenceRecord[]) {
  return {
    totalPreferences: items.length,
    emailEnabled: items.filter((item) => item.emailEnabled && !item.muted).length,
    smsEnabled: items.filter((item) => item.smsEnabled && !item.muted).length,
    muted: items.filter((item) => item.muted).length,
  };
}

function buildPreferenceFromStatus(status: any, now: string): PreferenceRecord {
  return {
    id: `notification-pref-${String(status.orderId || status.id || Date.now())}`,
    orderId: status.orderId || status.id || null,
    orderNumber: status.orderNumber || status.quoteReference || null,
    customerName: status.customerName || status.customer?.name || 'Storefront customer',
    email: status.email || status.customer?.email || null,
    phone: status.phone || status.customer?.phone || null,
    emailEnabled: true,
    smsEnabled: Boolean(status.phone || status.customer?.phone),
    muted: false,
    allowedEvents: ['order_received', 'in_production', 'ready_for_collection', 'dispatched', 'completed'],
    createdAt: now,
    updatedAt: now,
    history: [{ at: now, action: 'seeded_from_order_status', source: 'notification-preferences' }],
  };
}

export async function GET(request: NextRequest) {
  try {
    const items = await readConfigItems<PreferenceRecord>(request, PREFERENCE_KEY);
    return NextResponse.json({ ok: true, source: 'internal-notification-preferences-db', data: { items, summary: summarise(items) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'seed-defaults');
    const now = new Date().toISOString();
    const preferences = await readConfigItems<PreferenceRecord>(request, PREFERENCE_KEY);

    if (action === 'seed-defaults') {
      const statuses = await readConfigItems<any>(request, ORDER_STATUS_KEY);
      const seeded = statuses.map((status) => {
        const existing = preferences.find((item) => String(item.orderId) === String(status.orderId || status.id));
        return existing || buildPreferenceFromStatus(status, now);
      });
      const merged = [...seeded, ...preferences.filter((pref) => !seeded.some((item) => String(item.id) === String(pref.id)))];
      await saveConfigItems(request, PREFERENCE_KEY, 'Storefront notification preferences', 'Customer channel preferences and delivery rules for storefront order notifications.', merged, 'StorefrontNotificationPreferences');
      return NextResponse.json({ ok: true, source: 'internal-notification-preferences-db', data: { items: merged, summary: summarise(merged) } });
    }

    const id = String(body.id || '').trim();
    if (!id) return responseError(new Error('id is required.'), 400);
    const nextItems = preferences.map((item) => {
      if (String(item.id) !== id) return item;
      const next = { ...item } as PreferenceRecord;
      if (action === 'toggle-email') next.emailEnabled = !next.emailEnabled;
      if (action === 'toggle-sms') next.smsEnabled = !next.smsEnabled;
      if (action === 'toggle-muted') next.muted = !next.muted;
      next.updatedAt = now;
      next.history = [...(Array.isArray(item.history) ? item.history : []), { at: now, action, source: 'notification-preferences' }];
      return next;
    });
    if (!nextItems.some((item) => String(item.id) === id)) return responseError(new Error('Notification preference was not found.'), 404);

    await saveConfigItems(request, PREFERENCE_KEY, 'Storefront notification preferences', 'Customer channel preferences and delivery rules for storefront order notifications.', nextItems, 'StorefrontNotificationPreferences');

    const notifications = await readConfigItems<any>(request, NOTIFICATION_KEY);
    const nextNotifications = notifications.map((notification) => {
      const pref = nextItems.find((item) => String(item.orderId) === String(notification.orderId));
      if (!pref) return notification;
      const channelDisabled = (notification.channel === 'email' && !pref.emailEnabled) || (notification.channel === 'sms' && !pref.smsEnabled) || pref.muted;
      return channelDisabled && notification.status === 'queued'
        ? { ...notification, status: 'blocked-by-preference', updatedAt: now, preferenceId: pref.id }
        : notification;
    });
    await saveConfigItems(request, NOTIFICATION_KEY, 'Storefront customer notifications', 'Queued customer notification events created from customer-visible order status changes.', nextNotifications, 'StorefrontCustomerNotifications');

    return NextResponse.json({ ok: true, source: 'internal-notification-preferences-db', data: { items: nextItems, notifications: nextNotifications, summary: summarise(nextItems) } });
  } catch (error) {
    return responseError(error);
  }
}
