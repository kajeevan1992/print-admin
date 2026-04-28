export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const NOTIFICATION_KEY = 'storefront-customer-notifications';
const AUDIT_KEY = 'storefront-notification-audit-log';
const COMMUNICATION_KEY = 'storefront-customer-communication-log';

type CommunicationRecord = Record<string, any> & {
  id: string;
  orderId?: string;
  channel: string;
  direction: string;
  status: string;
  subject: string;
  message: string;
  createdAt: string;
};

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Customer communication request failed.' }, { status });
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

function summarise(items: CommunicationRecord[]) {
  return {
    totalMessages: items.length,
    outbound: items.filter((item) => item.direction === 'outbound').length,
    internalNotes: items.filter((item) => item.channel === 'internal-note').length,
    email: items.filter((item) => item.channel === 'email').length,
    sms: items.filter((item) => item.channel === 'sms').length,
  };
}

function fromNotification(notification: any): CommunicationRecord {
  return {
    id: `comm-from-${String(notification.id || Date.now())}`,
    sourceId: notification.id || null,
    source: 'customer-notification',
    orderId: notification.orderId || null,
    orderNumber: notification.orderNumber || null,
    customer: notification.customer || null,
    channel: String(notification.channel || 'email'),
    direction: 'outbound',
    status: String(notification.status || 'queued'),
    subject: String(notification.subject || 'Customer notification'),
    message: String(notification.message || ''),
    createdAt: String(notification.createdAt || notification.updatedAt || new Date().toISOString()),
    updatedAt: notification.updatedAt || null,
  };
}

function fromAudit(audit: any): CommunicationRecord {
  return {
    id: `comm-audit-${String(audit.id || Date.now())}`,
    sourceId: audit.id || null,
    source: 'notification-audit',
    orderId: audit.orderId || null,
    orderNumber: audit.orderNumber || null,
    notificationId: audit.notificationId || null,
    channel: String(audit.channel || 'audit'),
    direction: 'system',
    status: String(audit.status || audit.action || 'audit'),
    subject: String(audit.subject || 'Notification audit event'),
    message: String(audit.note || audit.action || 'Notification audit event'),
    createdAt: String(audit.createdAt || new Date().toISOString()),
  };
}

export async function GET(request: NextRequest) {
  try {
    const [manualItems, notifications, auditItems] = await Promise.all([
      readConfigItems<CommunicationRecord>(request, COMMUNICATION_KEY),
      readConfigItems<any>(request, NOTIFICATION_KEY),
      readConfigItems<any>(request, AUDIT_KEY),
    ]);
    const items = [
      ...manualItems,
      ...notifications.map(fromNotification),
      ...auditItems.map(fromAudit),
    ].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return NextResponse.json({ ok: true, source: 'internal-customer-communications-db', data: { items, summary: summarise(items) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = String(body.orderId || '').trim();
    const message = String(body.message || '').trim();
    if (!orderId) return responseError(new Error('orderId is required.'), 400);
    if (!message) return responseError(new Error('message is required.'), 400);

    const manualItems = await readConfigItems<CommunicationRecord>(request, COMMUNICATION_KEY);
    const now = new Date().toISOString();
    const item: CommunicationRecord = {
      id: `communication-${Date.now()}`,
      orderId,
      orderNumber: body.orderNumber || null,
      customerName: body.customerName || null,
      channel: String(body.channel || 'internal-note'),
      direction: 'internal',
      status: 'logged',
      subject: String(body.subject || 'Internal customer communication note'),
      message,
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, action: 'manual_note_logged', source: 'customer-communications' }],
    };
    const nextItems = [item, ...manualItems];
    await saveConfigItems(request, COMMUNICATION_KEY, 'Customer communication log', 'Manual notes and communication visibility records for storefront orders.', nextItems, 'StorefrontCustomerCommunications');
    return NextResponse.json({ ok: true, source: 'internal-customer-communications-db', data: { items: nextItems, summary: summarise(nextItems) }, item });
  } catch (error) {
    return responseError(error);
  }
}
