export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const NOTIFICATION_KEY = 'storefront-customer-notifications';
const AUDIT_KEY = 'storefront-notification-audit-log';

type NotificationRecord = Record<string, any> & { id: string; status: string; channel: string; orderId: string; updatedAt?: string; history?: any[]; attempts?: number; };
type AuditRecord = Record<string, any> & { id: string; notificationId: string; action: string; status: string; createdAt: string; };

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Notification audit request failed.' }, { status });
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

function summarise(notifications: NotificationRecord[], audits: AuditRecord[]) {
  return {
    totalNotifications: notifications.length,
    queued: notifications.filter((item) => item.status === 'queued').length,
    sent: notifications.filter((item) => item.status === 'sent').length,
    failed: notifications.filter((item) => item.status === 'failed').length,
    retryReady: notifications.filter((item) => item.status === 'failed' || item.status === 'retry-ready').length,
    auditEvents: audits.length,
  };
}

export async function GET(request: NextRequest) {
  try {
    const [notifications, auditItems] = await Promise.all([
      readConfigItems<NotificationRecord>(request, NOTIFICATION_KEY),
      readConfigItems<AuditRecord>(request, AUDIT_KEY),
    ]);
    return NextResponse.json({ ok: true, source: 'internal-notification-audit-db', data: { items: auditItems, notifications, summary: summarise(notifications, auditItems) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'mark-sent');
    const notificationId = String(body.notificationId || body.id || '').trim();
    if (!notificationId) return responseError(new Error('notificationId is required.'), 400);

    const [notifications, auditItems] = await Promise.all([
      readConfigItems<NotificationRecord>(request, NOTIFICATION_KEY),
      readConfigItems<AuditRecord>(request, AUDIT_KEY),
    ]);
    const existing = notifications.find((item) => String(item.id) === notificationId);
    if (!existing) return responseError(new Error('Notification event was not found.'), 404);

    const now = new Date().toISOString();
    const nextStatus = action === 'mark-failed' ? 'failed' : action === 'retry' ? 'queued' : 'sent';
    const actionLabel = action === 'mark-failed' ? 'send_failed' : action === 'retry' ? 'retry_queued' : 'send_marked_sent';
    const nextNotifications = notifications.map((item) => {
      if (String(item.id) !== notificationId) return item;
      const attempts = Number(item.attempts || 0) + 1;
      return {
        ...item,
        status: nextStatus,
        attempts,
        lastAttemptAt: now,
        updatedAt: now,
        history: [...(Array.isArray(item.history) ? item.history : []), { at: now, action: actionLabel, source: 'notification-audit' }],
      };
    });

    const auditRecord: AuditRecord = {
      id: `notification-audit-${Date.now()}`,
      notificationId,
      orderId: existing.orderId || null,
      orderNumber: existing.orderNumber || null,
      channel: existing.channel || null,
      subject: existing.subject || null,
      action: actionLabel,
      status: nextStatus,
      note: String(body.note || ''),
      createdAt: now,
    };
    const nextAuditItems = [auditRecord, ...auditItems];

    await Promise.all([
      saveConfigItems(request, NOTIFICATION_KEY, 'Storefront customer notifications', 'Queued customer notification events created from customer-visible order status changes.', nextNotifications, 'StorefrontCustomerNotifications'),
      saveConfigItems(request, AUDIT_KEY, 'Customer notification audit log', 'Internal send, fail, and retry audit trail for queued customer notifications.', nextAuditItems, 'StorefrontNotificationAudit'),
    ]);

    return NextResponse.json({ ok: true, source: 'internal-notification-audit-db', data: { items: nextAuditItems, notifications: nextNotifications, summary: summarise(nextNotifications, nextAuditItems) }, item: auditRecord });
  } catch (error) {
    return responseError(error);
  }
}
