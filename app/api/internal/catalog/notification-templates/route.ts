export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const TEMPLATE_KEY = 'storefront-notification-templates';
const NOTIFICATION_KEY = 'storefront-customer-notifications';

type TemplateRecord = Record<string, any> & { id: string; key: string; channel: string; subject: string; body: string; status: string; updatedAt: string; };

const defaultTemplates: TemplateRecord[] = [
  { id: 'tmpl-order-received-email', key: 'order-received', channel: 'email', subject: 'We have received your print order', body: 'Hi {{customerName}}, your order {{orderNumber}} has been received. We will review artwork and move it into production shortly.', status: 'active', updatedAt: new Date(0).toISOString() },
  { id: 'tmpl-in-production-email', key: 'in-production', channel: 'email', subject: 'Your print order is now in production', body: 'Hi {{customerName}}, order {{orderNumber}} is now in production. Estimated delivery/collection: {{deliveryEstimate}}.', status: 'active', updatedAt: new Date(0).toISOString() },
  { id: 'tmpl-ready-for-collection-sms', key: 'ready-for-collection', channel: 'sms', subject: 'Ready for collection', body: 'Your print order {{orderNumber}} is ready for collection. Ref: {{trackingReference}}', status: 'active', updatedAt: new Date(0).toISOString() },
  { id: 'tmpl-in-transit-sms', key: 'in-transit', channel: 'sms', subject: 'Order on the way', body: 'Your print order {{orderNumber}} is on the way. Tracking: {{trackingReference}}', status: 'active', updatedAt: new Date(0).toISOString() },
];

function responseError(error: unknown, status = 500) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Notification template request failed.' }, { status }); }

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
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, { id: key, slug: key, name, description, metadataJson: { items, savedAt: new Date().toISOString(), storageKey: key, source } } as any);
}

function templatesWithDefaults(items: TemplateRecord[]) {
  const existingKeys = new Set(items.map((item) => `${item.key}:${item.channel}`));
  return [...items, ...defaultTemplates.filter((item) => !existingKeys.has(`${item.key}:${item.channel}`))];
}

function summarise(templates: TemplateRecord[], notifications: any[]) {
  return { totalTemplates: templates.length, activeTemplates: templates.filter((item) => item.status !== 'disabled').length, emailTemplates: templates.filter((item) => item.channel === 'email').length, smsTemplates: templates.filter((item) => item.channel === 'sms').length, notificationLog: notifications.length, queued: notifications.filter((item) => item.status === 'queued').length, sent: notifications.filter((item) => item.status === 'sent').length };
}

export async function GET(request: NextRequest) {
  try {
    const [savedTemplates, notifications] = await Promise.all([readConfigItems<TemplateRecord>(request, TEMPLATE_KEY), readConfigItems<any>(request, NOTIFICATION_KEY)]);
    const templates = templatesWithDefaults(savedTemplates);
    return NextResponse.json({ ok: true, source: 'internal-notification-templates-db', data: { items: templates, notifications, summary: summarise(templates, notifications) } });
  } catch (error) { return responseError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'seed-defaults');
    const savedTemplates = await readConfigItems<TemplateRecord>(request, TEMPLATE_KEY);
    let nextItems = templatesWithDefaults(savedTemplates);
    if (action === 'toggle-template') {
      const id = String(body.id || '').trim();
      if (!id) return responseError(new Error('id is required.'), 400);
      nextItems = nextItems.map((item) => item.id === id ? { ...item, status: item.status === 'disabled' ? 'active' : 'disabled', updatedAt: new Date().toISOString() } : item);
    }
    await saveConfigItems(request, TEMPLATE_KEY, 'Customer notification templates', 'Reusable customer notification templates for storefront order status events.', nextItems, 'StorefrontNotificationTemplates');
    const notifications = await readConfigItems<any>(request, NOTIFICATION_KEY);
    return NextResponse.json({ ok: true, source: 'internal-notification-templates-db', data: { items: nextItems, notifications, summary: summarise(nextItems, notifications) }, item: nextItems.find((item) => item.id === String(body.id || '')) || null });
  } catch (error) { return responseError(error); }
}
