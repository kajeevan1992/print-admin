export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const ORDER_STATUS_KEY = 'storefront-order-status-audit';
const NOTIFICATION_KEY = 'storefront-customer-notifications';

type NotificationRecord = Record<string, any> & {
  id: string;
  orderId: string;
  channel: string;
  status: string;
  subject: string;
  message: string;
  createdAt: string;
};

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Customer notifications request failed.' }, { status });
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

function summarise(items: NotificationRecord[]) {
  return {
    total: items.length,
    email: items.filter((item) => item.channel === 'email').length,
    sms: items.filter((item) => item.channel === 'sms').length,
    queued: items.filter((item) => item.status === 'queued').length,
    sent: items.filter((item) => item.status === 'sent').length,
  };
}

function subjectForStatus(status: string) {
  if (status === 'order-received') return 'We have received your print order';
  if (status === 'in-production') return 'Your print order is now in production';
  if (status === 'production-complete') return 'Your print order is ready for dispatch';
  if (status === 'in-transit') return 'Your print order is on the way';
  if (status === 'ready-for-collection') return 'Your print order is ready for collection';
  if (status === 'delivered') return 'Your print order has been delivered';
  if (status === 'collected') return 'Your print order has been collected';
  if (status === 'on-hold') return 'Your print order needs attention';
  return 'Your print order status has been updated';
}

export async function GET(request: NextRequest) {
  try {
    const items = await readConfigItems<NotificationRecord>(request, NOTIFICATION_KEY);
    return NextResponse.json({ ok: true, source: 'internal-customer-notifications-db', data: { items, summary: summarise(items) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = String(body.orderId || '').trim();
    const channel = String(body.channel || 'email').trim().toLowerCase();
    if (!orderId) return responseError(new Error('orderId is required.'), 400);
    if (!['email', 'sms'].includes(channel)) return responseError(new Error('channel must be email or sms.'), 400);

    const [statuses, existingItems] = await Promise.all([
      readConfigItems<any>(request, ORDER_STATUS_KEY),
      readConfigItems<NotificationRecord>(request, NOTIFICATION_KEY),
    ]);
    const status = statuses.find((item) => String(item.orderId || '') === orderId);
    if (!status) return responseError(new Error('Customer status record was not found.'), 404);

    const now = new Date().toISOString();
    const visibleStatus = String(status.customerVisibleStatus || 'order-received');
    const message = String(body.message || status.lastMessage || 'Your order status has been updated.');
    const item: NotificationRecord = {
      id: `notification-${Date.now()}`,
      orderId,
      orderNumber: status.orderNumber || null,
      jobId: status.jobId || null,
      customer: status.customer || null,
      channel,
      status: 'queued',
      customerVisibleStatus: visibleStatus,
      subject: String(body.subject || subjectForStatus(visibleStatus)),
      message,
      trackingReference: status.trackingReference || null,
      deliveryEstimate: status.deliveryEstimate || null,
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, action: 'queued', source: 'customer-notifications' }],
    };

    const nextItems = [item, ...existingItems];
    await saveConfigItems(request, NOTIFICATION_KEY, 'Storefront customer notifications', 'Queued customer notification events created from customer-visible order status changes.', nextItems, 'StorefrontCustomerNotifications');
    return NextResponse.json({ ok: true, source: 'internal-customer-notifications-db', data: { items: nextItems, summary: summarise(nextItems) }, item });
  } catch (error) {
    return responseError(error);
  }
}
