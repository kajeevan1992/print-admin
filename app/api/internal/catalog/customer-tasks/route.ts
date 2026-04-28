export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const TASK_KEY = 'storefront-customer-service-tasks';
const COMMUNICATION_KEY = 'storefront-customer-communication-log';

type CustomerTask = Record<string, any> & {
  id: string;
  orderId: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string;
  createdAt: string;
  updatedAt: string;
};

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Customer task update failed.' }, { status });
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

function dueDate(hours = 24) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function statusFromAction(action: string, current?: string) {
  if (action === 'start') return 'in-progress';
  if (action === 'complete') return 'completed';
  if (action === 'block') return 'blocked';
  if (action === 'reopen') return 'open';
  return current || 'open';
}

function priorityFromAction(action: string, current?: string) {
  if (action === 'urgent') return 'urgent';
  if (action === 'normal') return 'normal';
  return current || 'normal';
}

function summarise(items: CustomerTask[]) {
  const now = Date.now();
  return {
    totalTasks: items.length,
    open: items.filter((item) => item.status === 'open').length,
    inProgress: items.filter((item) => item.status === 'in-progress').length,
    blocked: items.filter((item) => item.status === 'blocked').length,
    completed: items.filter((item) => item.status === 'completed').length,
    urgent: items.filter((item) => item.priority === 'urgent').length,
    overdue: items.filter((item) => item.status !== 'completed' && item.dueAt && new Date(item.dueAt).getTime() < now).length,
  };
}

async function logTaskCommunication(request: NextRequest, item: CustomerTask, action: string) {
  const communications = await readConfigItems<any>(request, COMMUNICATION_KEY);
  const now = new Date().toISOString();
  const note = {
    id: `communication-task-${Date.now()}`,
    orderId: item.orderId,
    orderNumber: item.orderNumber || null,
    customerName: item.customerName || null,
    channel: 'internal-note',
    direction: 'internal',
    status: 'logged',
    subject: `Customer task ${item.status}`,
    message: `${action}: ${item.title}`,
    createdAt: now,
    updatedAt: now,
    source: 'customer-tasks',
    history: [{ at: now, action, status: item.status, source: 'customer-tasks' }],
  };
  await saveConfigItems(request, COMMUNICATION_KEY, 'Customer communication log', 'Manual notes and communication visibility records for storefront orders.', [note, ...communications], 'StorefrontCustomerCommunications');
}

export async function GET(request: NextRequest) {
  try {
    const items = await readConfigItems<CustomerTask>(request, TASK_KEY);
    const sorted = [...items].sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
    return NextResponse.json({ ok: true, source: 'internal-customer-tasks-db', data: { items: sorted, summary: summarise(sorted) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'create-task').trim();
    const orderId = String(body.orderId || '').trim();
    if (!orderId) return responseError(new Error('orderId is required.'), 400);

    const existingItems = await readConfigItems<CustomerTask>(request, TASK_KEY);
    const now = new Date().toISOString();
    const matchIndex = existingItems.findIndex((item) => String(item.id) === String(body.taskId || '') || (String(item.orderId) === orderId && String(item.sourceRef || '') === String(body.sourceRef || action)));
    const current = matchIndex >= 0 ? existingItems[matchIndex] : null;
    const item: CustomerTask = {
      ...(current || {}),
      id: current?.id || `task-${Date.now()}`,
      orderId,
      orderNumber: body.orderNumber || current?.orderNumber || null,
      customerName: body.customerName || current?.customerName || null,
      customerEmail: body.customerEmail || current?.customerEmail || null,
      title: String(body.title || current?.title || 'Customer service follow-up'),
      sourceRef: String(body.sourceRef || current?.sourceRef || action),
      status: statusFromAction(action, current?.status),
      priority: priorityFromAction(action, current?.priority),
      dueAt: body.dueAt || current?.dueAt || dueDate(Number(body.dueInHours || 24)),
      note: String(body.note || current?.note || 'Follow up with customer/order before dispatch completion.'),
      createdAt: current?.createdAt || now,
      updatedAt: now,
      history: [...(Array.isArray(current?.history) ? current.history : []), { at: now, action, status: statusFromAction(action, current?.status), source: 'customer-tasks' }],
    };

    const nextItems = matchIndex >= 0 ? existingItems.map((old, index) => index === matchIndex ? item : old) : [item, ...existingItems];
    await saveConfigItems(request, TASK_KEY, 'Customer service tasks', 'Internal task list for customer/order follow-ups. No external notifications are sent here.', nextItems, 'StorefrontCustomerTasks');
    await logTaskCommunication(request, item, action);
    return NextResponse.json({ ok: true, source: 'internal-customer-tasks-db', data: { items: nextItems, summary: summarise(nextItems) }, item });
  } catch (error) {
    return responseError(error);
  }
}
